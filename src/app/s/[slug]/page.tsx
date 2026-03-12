import { getPublicShare } from "@/lib/share-service";
import { PublicShareClient, type PublicPayload } from "@/components/public/public-share-client";

export const dynamic = "force-dynamic";

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const initialPayload = (await getPublicShare(slug)) as PublicPayload;

  return <PublicShareClient initialPayload={initialPayload} slug={slug} />;
}
