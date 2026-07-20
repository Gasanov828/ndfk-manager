import { getAuthSession } from "@/lib/auth";

import { getPlayerWelcomeForProfile } from "@/lib/server/playerWelcome";

import { NextResponse } from "next/server";



export async function GET() {

  const { user, profile } = await getAuthSession();



  if (!user) {

    return NextResponse.json({ welcome: null, personalMvp: null });

  }



  const { welcome, personalMvp } = await getPlayerWelcomeForProfile(profile);



  return NextResponse.json({ welcome, personalMvp });

}


