import { notFound } from "next/navigation";
import YearPageClient from "@/components/YearPageClient";

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

export function generateStaticParams() {
  return YEARS.map((year) => ({ year: String(year) }));
}

export default async function YearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (!YEARS.includes(year)) notFound();
  return <YearPageClient year={year} />;
}
