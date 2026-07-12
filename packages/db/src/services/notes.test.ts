import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import type { NoteWithTags } from "../services/notes";
import * as notesService from "../services/notes";

const noteFixture: NoteWithTags = {
  id: "11111111-1111-1111-1111-111111111111",
  userId: "22222222-2222-2222-2222-222222222222",
  title: "fixture",
  content: [] as unknown as NoteWithTags["content"],
  contentText: "",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  tags: [],
};

const blockWithEmptyFields = [
  {
    type: "paragraph",
    props: { textColor: "default" },
    content: [{ type: "text", text: "hi", styles: {} }],
    children: [],
  },
] as unknown as Parameters<typeof notesService.createNote>[2]["content"];

type Sets = Array<Record<string, unknown>>;
type ValueInserts = Array<Record<string, unknown>>;

function chainWithFinal<T>(final: T): Promise<T> & Record<string, () => unknown> {
  const proxyTarget: Record<string, unknown> = {};
  const state: { finalValue: T } = { finalValue: final };
  const proxy = new Proxy(state, {
    get(target, prop) {
      if (prop === "then") {
        return (
          onFulfilled?: ((v: unknown) => unknown) | null | undefined,
          onRejected?: ((e: unknown) => unknown) | null | undefined,
        ) => Promise.resolve(target.finalValue).then(onFulfilled, onRejected);
      }
      if (prop === "finalValue") return target.finalValue;
      if (prop in proxyTarget) return proxyTarget[prop];
      const fn = () => proxy;
      proxyTarget[prop as string] = fn;
      return fn;
    },
    set(target, prop, value) {
      target[prop as keyof typeof target] = value;
      return true;
    },
  });
  return proxy as unknown as Promise<T> & Record<string, () => unknown>;
}

function buildDb(options: {
  selectRows?: unknown[];
  insertRows?: unknown[];
  selectTags?: unknown[];
}) {
  const sets: Sets = [];
  const valueInserts: ValueInserts = [];
  let selectCallIndex = 0;

  const noteSelectChain = chainWithFinal(options.selectRows ?? []);
  const tagsSelectChain = chainWithFinal(options.selectTags ?? []);
  const insertResultChain = chainWithFinal(options.insertRows ?? []);

  const db = {
    insert: vi.fn(() => ({
      values: vi.fn((v: Record<string, unknown>) => {
        valueInserts.push(v);
        return insertResultChain;
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((v: Record<string, unknown>) => {
        sets.push(v);
        return chainWithFinal(undefined);
      }),
    })),
    select: vi.fn(() => {
      const idx = selectCallIndex++;
      if (idx === 0) return noteSelectChain;
      return tagsSelectChain;
    }),
    delete: vi.fn(() => chainWithFinal(undefined)),
  };

  return {
    db: db as unknown as Parameters<typeof notesService.createNote>[0],
    sets,
    valueInserts,
  };
}

function expectJsonbSql(contentValue: unknown, expected: unknown) {
  const fragment = contentValue as ReturnType<typeof sql> & {
    queryChunks: unknown[];
  };
  const expectedStr = JSON.stringify(expected);
  const chunks = fragment.queryChunks as Array<unknown>;

  console.log("=== DEBUG queryChunks ===");
  for (const chunk of chunks) {
    if (chunk && typeof chunk === "object") {
      console.log(
        `  chunk keys=[${Object.keys(chunk as object)}] value=${JSON.stringify(
          (chunk as Record<string, unknown>).value,
        )} encoder=${(chunk as Record<string, unknown>).encoder !== undefined}`,
      );
    } else {
      console.log(`  chunk (primitive): typeof=${typeof chunk} value=${JSON.stringify(chunk)}`);
    }
  }
  console.log("=========================");

  let concat = "";
  const params: unknown[] = [];
  for (const chunk of chunks) {
    console.log(`  processing chunk: typeof=${typeof chunk}`, chunk);
    if (typeof chunk === "string") {
      console.log(`    -> raw string: "${chunk}"`);
      concat += chunk;
    } else if (chunk && typeof chunk === "object") {
      const c = chunk as {
        value?: unknown;
        encoder?: unknown;
      };
      const hasEncoder = "encoder" in c;
      const encoderVal = c.encoder;
      const hasValue = "value" in c;
      const valType = typeof c.value;
      console.log(`    -> hasEncoder=${hasEncoder} encoderVal=${JSON.stringify(encoderVal)} hasValue=${hasValue} valType=${valType}`);
      if (hasEncoder && encoderVal) {
        console.log("    -> BRANCH: Param");
        const encoder = encoderVal as { mapToDriverValue?: (v: unknown) => unknown };
        const mapped = encoder.mapToDriverValue
          ? encoder.mapToDriverValue(c.value)
          : c.value;
        concat += "?";
        params.push(mapped);
      } else if (hasValue && valType === "string") {
        console.log(`    -> BRANCH: StringChunk value="${c.value}"`);
        concat += c.value as string;
      } else {
        console.log("    -> BRANCH: unknown object");
      }
    }
  }
  console.log(`  Final concat="${concat}" params=${JSON.stringify(params)}`);

  expect(concat).toBe("?::jsonb");
  expect(params).toEqual([expectedStr]);
}

describe("notes service content serialization (issue #10)", () => {
  it("createNote serializes nested empty objects/arrays as a ::jsonb SQL fragment", async () => {
    const handle = buildDb({ insertRows: [noteFixture] });

    await notesService.createNote(handle.db, noteFixture.userId, {
      title: "new",
      content: blockWithEmptyFields,
    });

    expect(handle.valueInserts).toHaveLength(1);
    expectJsonbSql(handle.valueInserts[0].content, blockWithEmptyFields);
  });

  it("createNote defaults content to an empty array jsonb fragment when content is omitted", async () => {
    const handle = buildDb({ insertRows: [noteFixture] });

    await notesService.createNote(handle.db, noteFixture.userId, {
      title: "blank",
    });

    expect(handle.valueInserts).toHaveLength(1);
    expectJsonbSql(handle.valueInserts[0].content, []);
  });

  it("updateNote serializes nested empty objects/arrays as a ::jsonb SQL fragment", async () => {
    const handle = buildDb({
      selectRows: [noteFixture],
      selectTags: [],
    });

    const result = await notesService.updateNote(
      handle.db,
      noteFixture.id,
      noteFixture.userId,
      { content: blockWithEmptyFields },
    );

    console.log("DEBUG result:", JSON.stringify(result));
    console.log("DEBUG sets length:", handle.sets.length);
    if (handle.sets.length > 0) {
      console.log("DEBUG sets[0] keys:", Object.keys(handle.sets[0]));
      console.log("DEBUG sets[0].content:", handle.sets[0].content);
      console.log("DEBUG sets[0].content type:", typeof handle.sets[0].content);
      if (handle.sets[0].content) {
        console.log("DEBUG content keys:", Object.keys(handle.sets[0].content as object));
        console.log("DEBUG content.getSQL:", typeof (handle.sets[0].content as { getSQL?: unknown }).getSQL);
      }
    }
    expect(handle.sets.length).toBeGreaterThanOrEqual(1);
    expectJsonbSql(handle.sets[0].content, blockWithEmptyFields);
  });

  it("updateNote does not include content in set() when content is undefined", async () => {
    const handle = buildDb({
      selectRows: [noteFixture],
      selectTags: [],
    });

    await notesService.updateNote(handle.db, noteFixture.id, noteFixture.userId, {
      title: "renamed",
    });

    expect(handle.sets.length).toBeGreaterThanOrEqual(1);
    expect(handle.sets[0].content).toBeUndefined();
    expect(handle.sets[0].title).toBe("renamed");
  });
});
