
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { firstname, lastname, mobile, email, password } = body;

    // 1. Validate fields
    if (!firstname || !lastname || !mobile || !email || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // 2. Validate mobile number
    if (!/^\d{10,15}$/.test(mobile)) {
      return NextResponse.json(
        { message: "Enter a valid mobile number" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must contain at least 8 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    // 3. Check existing user
    const existingUser = await pool.query(
      `SELECT id FROM users
       WHERE mobile = $1 OR email = $2`,
      [normalizedMobile, normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { message: "Mobile number or email already registered" },
        { status: 409 }
      );
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Save user in PostgreSQL
    const result = await pool.query(
      `INSERT INTO users
       (firstname, lastname, mobile, email, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, firstname, lastname, mobile, email`,
      [
        firstname.trim(),
        lastname.trim(),
        normalizedMobile,
        normalizedEmail,
        hashedPassword,
      ]
    );

    // 6. Return success
    return NextResponse.json(
      {
        message: "Account created successfully",
        user: result.rows[0],
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { message: "Mobile number or email already registered" },
        { status: 409 }
      );
    }

    console.error("Signup error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
