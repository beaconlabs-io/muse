import { Card, CardContent } from "@/components/ui/card";
// import { shortAddr } from "@/utils";
import { Star } from "lucide-react";
import React from "react";
import { getPostBySlug } from "@/utils";

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const response = await getPostBySlug(slug);

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Evidence not found</div>
      </div>
    );
  }

  const stars = Array.from(
    { length: 5 },
    (_, i) => i < Number(response.meta.strength)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardContent>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {response.meta.title}
            </h1>
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span>Created {response.meta.date}</span>

              <span>•</span>
              <span>By {response.meta.author}</span>
            </div>
          </div>

          <div className="prose max-w-none">
            <article>{response.content}</article>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Evidence Level</h3>
                <div className="flex items-center gap-0.5">
                  {stars.map((filled, i) =>
                    filled ? (
                      <Star
                        key={i}
                        size={18}
                        className="text-yellow-400 fill-yellow-400"
                      />
                    ) : (
                      <Star key={i} size={18} className="text-gray-300" />
                    )
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Effect</h3>
                <p className="text-gray-700">{response.meta.effectiveness}</p>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Methodology</h3>
              <p className="text-gray-700">{response.meta.methodologies}</p>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
              <ul className="list-disc list-inside text-gray-700">
                {response.meta.data_sources.map((source, index) => (
                  <li key={index}>{source}</li>
                ))}
              </ul>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Citation</h3>
              <p className="text-gray-700">{response.meta.citation}</p>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {response.meta.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {/* <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-2">Metadata</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Attester</dt>
                  <dd className="text-gray-900">
                    {shortAddr(response.meta.attester, 6)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Schema ID</dt>
                  <dd className="text-gray-900">
                    {shortAddr(response.schemaId, 6)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Revocable</dt>
                  <dd className="text-gray-900">
                    {response.revocable ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </div> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
