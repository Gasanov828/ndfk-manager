"use client";



import PersonalMvpCard from "@/components/PersonalMvpCard";

import PlayerWelcomeCard from "@/components/PlayerWelcomeCard";

import { useAuthProfile } from "@/hooks/useAuthProfile";

import type { MatchMvpInfo } from "@/lib/matchRatings";

import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";

import Link from "next/link";

import { useEffect, useState } from "react";



type PlayerWelcomeSectionProps = {

  initialWelcome: PlayerWelcomeData | null;

  initialPersonalMvp?: MatchMvpInfo | null;

};



export default function PlayerWelcomeSection({

  initialWelcome,

  initialPersonalMvp = null,

}: PlayerWelcomeSectionProps) {

  const { user, profile, loading } = useAuthProfile();

  const [welcome, setWelcome] = useState<PlayerWelcomeData | null>(

    initialWelcome

  );

  const [personalMvp, setPersonalMvp] = useState<MatchMvpInfo | null>(

    initialPersonalMvp

  );

  const [fetching, setFetching] = useState(false);



  useEffect(() => {

    setWelcome(initialWelcome);

    setPersonalMvp(initialPersonalMvp);

  }, [initialWelcome, initialPersonalMvp]);



  useEffect(() => {

    if (welcome || loading || fetching || !user) return;

    if (!profile?.player_id || profile.role === "admin") return;



    let cancelled = false;

    setFetching(true);



    fetch("/api/me/welcome", { cache: "no-store" })

      .then((response) => response.json())

      .then(

        (data: {

          welcome: PlayerWelcomeData | null;

          personalMvp: MatchMvpInfo | null;

        }) => {

          if (cancelled) return;

          if (data.welcome) setWelcome(data.welcome);

          if (data.personalMvp) setPersonalMvp(data.personalMvp);

        }

      )

      .catch(() => {

        // ignore � guest view stays

      })

      .finally(() => {

        if (!cancelled) setFetching(false);

      });



    return () => {

      cancelled = true;

    };

  }, [welcome, loading, fetching, user, profile]);



  function handleNameUpdated(name: string) {

    setWelcome((prev) =>

      prev

        ? {

            ...prev,

            name,

            firstName: getFirstName(name),

          }

        : null

    );

  }



  if (welcome) {

    return (

      <>

        <PlayerWelcomeCard data={welcome} onNameUpdated={handleNameUpdated} />

        {personalMvp && <PersonalMvpCard mvp={personalMvp} />}

      </>

    );

  }



  if (loading || fetching) {

    return (

      <section className="glass-panel-strong mb-6 animate-pulse rounded-2xl p-4 sm:p-5">

        <div className="h-20 rounded-xl bg-white/5" />

      </section>

    );

  }



  if (user && profile && profile.role !== "admin" && !profile.player_id) {

    return (

      <section className="mb-8 rounded-3xl border border-amber-400/25 bg-amber-500/10 p-5">

        <p className="text-sm font-semibold text-amber-100">

          ������� �� �������� � ������

        </p>

        <p className="mt-2 text-sm text-amber-100/80">

          ��������� ����������� �� invite-������ �� �������� � ����� �� �������

          �������� ���� �������� � ��������� � �����������.

        </p>

        <Link

          href="/player/login"

          className="mt-3 inline-block text-sm font-medium text-cyan-300 hover:underline"

        >

          ����� � ������ ��������� ?

        </Link>

      </section>

    );

  }



  return null;

}


