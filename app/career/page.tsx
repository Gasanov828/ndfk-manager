import PageHeader from "@/components/PageHeader";
import CareerBoard from "@/components/CareerBoard";

export default function CareerPage() {
  return (
    <>
      <PageHeader
        title="Карьера"
        subtitle="Я или клуб — переключатель сверху"
        icon="🏆"
      />
      <CareerBoard />
    </>
  );
}
