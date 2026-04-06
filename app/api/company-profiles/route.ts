import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .order("product_line")
    .order("product_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("company_profiles")
    .insert({
      product_name: body.product_name,
      product_line: body.product_line,
      description: body.description || null,
      keywords: body.keywords || [],
      specs: body.specs || {},
      target_agencies: body.target_agencies || [],
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
