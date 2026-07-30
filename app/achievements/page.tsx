import PageHeader from "@/components/PageHeader";
import AchievementsBoard from "@/components/AchievementsBoard";

export default function AchievementsPage() {
  return (
    <>
      <PageHeader
        title="Достижения"
        subtitle="Прогресс и награды игрока"
        icon="🏆"
      />
      <AchievementsBoard />
    </>
  );
}
