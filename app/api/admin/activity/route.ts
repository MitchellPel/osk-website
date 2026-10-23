import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Activity, dbRows, Movement } from "../../../server/supabase";
export async function GET(){
  if(!(await headers()).get("oai-authenticated-user-id"))return NextResponse.json({error:"Owner sign-in required"},{status:401});
  try{
    const [activity,movements]=await Promise.all([dbRows<Activity>("osk_activity","GET","select=*&order=created_at.desc&limit=100"),dbRows<Movement>("osk_inventory_movements","GET","select=*&order=created_at.desc&limit=100")]);
    return NextResponse.json({activity,movements});
  }catch{return NextResponse.json({error:"The admin database upgrade is not connected yet."},{status:503});}
}
