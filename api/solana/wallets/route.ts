import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // TODO: You can add logic here to save the address, validate it, etc.
    console.log("📥 Received Solana wallet address:", address);

    return NextResponse.json({ success: true, address });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
