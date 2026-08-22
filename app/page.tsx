import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ChecklistBand } from "@/components/home/ChecklistBand";
import { HomeHero } from "@/components/home/HomeHero";
import { IntroBand } from "@/components/home/IntroBand";

export default function Home() { return <main id="main-content"><HomeHero /><IntroBand /><CategoryGrid /><ChecklistBand /></main>; }
