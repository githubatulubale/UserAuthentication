
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import pool from "@/lib/db";
import { createSessionToken } from "@/lib/auth";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const mobile = String(body.mobile ?? "").trim();
    const password = String(body.password ?? "");

    // 1. Validate input
    if (!mobile || !password) {
      return NextResponse.json(
        { message: "Mobile number and password are required" },
        { status: 400 }
      );
    }

    // 2. Find user in PostgreSQL
    const result = await pool.query(
      `SELECT id, firstname, lastname, mobile, email, password
       FROM users
       WHERE mobile = $1`,
      [mobile]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Invalid mobile number or password" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // 3. Compare entered password with hashed password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Invalid mobile number or password" },
        { status: 401 }
      );
    }

    // 4. Create JWT session
    const token = await createSessionToken(user.id);

    // 5. Create response and secure cookie
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        mobile: user.mobile,
        email: user.email,
      },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
