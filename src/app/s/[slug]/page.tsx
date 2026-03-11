import { PublicShareClient } from "@/components/public/public-share-client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PublicShareClient slug={slug} />;
}
