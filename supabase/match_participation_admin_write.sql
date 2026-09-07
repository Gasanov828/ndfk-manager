-- Позволяет админу отмечать «играл / не играл» за любого игрока
-- (админская кнопка в Админка → Матчи → Результат), в дополнение
-- к тому, что игрок и раньше мог отмечать только сам себя.
-- Выполните после match_participation.sql и match_participation_rls.sql.
-- Безопасно перезапускать: политика пересоздаётся.

drop policy if exists "match_player_participation_admin_write" on public.match_player_participation;

create policy "match_player_participation_admin_write"
  on public.match_player_participation for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
