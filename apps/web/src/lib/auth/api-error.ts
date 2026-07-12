import "server-only";

import { NextResponse } from "next/server";

import type { TokenVerifyError } from "./verify-session-token";

export function authFailureResponse(error: TokenVerifyError): NextResponse {
  switch (error.code) {
    case "MISSING_TOKEN":
      return NextResponse.json(
        { error: "Missing X-Session-Token header" },
        { status: 401 },
      );
    case "INVALID_TOKEN":
      return NextResponse.json(
        {
          error: `Invalid session token${error.detail ? `: ${error.detail}` : ""}`,
        },
        { status: 401 },
      );
    case "USER_NOT_FOUND":
      return NextResponse.json(
        {
          error: "User not found — sign up at https://notes.aawej.in first",
          email: error.email,
        },
        { status: 401 },
      );
    case "SERVER_CONFIG_ERROR":
      return NextResponse.json(
        { error: "Server configuration error — contact support" },
        { status: 500 },
      );
  }
}
