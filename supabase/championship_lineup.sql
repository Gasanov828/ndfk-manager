-- Состав чемпионата на поле (отдельно от клубного lineup_position).
-- Supabase → SQL Editor → Run

alter table public.championship_player_season_stats
  add column if not exists lineup_slot text;

alter table public.championship_player_season_stats
  drop constraint if exists championship_lineup_slot_check;

alter table public.championship_player_season_stats
  add constraint championship_lineup_slot_check
  check (
    lineup_slot is null
    or lineup_slot in (
      'НАП1', 'НАП2',
      'ЦП1', 'ЦП2',
      'ЗАЩ1', 'ЗАЩ2', 'ЗАЩ3',
      'ВРТ'
    )
  );

-- Один слот — один игрок в сезоне
create unique index if not exists championship_lineup_slot_uidx
  on public.championship_player_season_stats (championship_id, lineup_slot)
  where lineup_slot is not null;
