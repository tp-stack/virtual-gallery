import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 px-8 max-w-[1440px] mx-auto">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-[#B8B2A4] hover:text-[#C8A96A] transition-colors duration-500 text-xs tracking-[0.12em] uppercase font-light"
        >
          ← Back to Home
        </Link>

        <div className="gold-line my-10" />

        <h1 className="font-light text-4xl md:text-5xl text-[#F5F2EA] mb-10 tracking-[-0.02em]">
          Disclaimer &amp; Research Prototype Notice
        </h1>

        <section className="space-y-8 text-[#E6E6E6] text-sm font-light leading-relaxed tracking-wide">
          <div className="p-6 rounded-[12px] bg-[#161616] border border-[#232323]">
            <h2 className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase mb-3 font-light">
              Research Prototype
            </h2>
            <p>
              This website is a controlled research prototype and technology demonstration. It is not a
              production service, nor is it intended to function as one. Features, data, and interfaces
              are subject to change without notice. Availability is not guaranteed.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-[#161616] border border-[#232323]">
            <h2 className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase mb-3 font-light">
              No Financial, Legal, or Valuation Advice
            </h2>
            <p>
              Nothing on this website constitutes financial advice, legal advice, investment
              recommendation, or valuation opinion. Artwork metadata, movement classifications, and
              historical data are provided for informational and educational purposes only. No claim
              is made regarding the authenticity, provenance, or market value of any artwork.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-[#161616] border border-[#232323]">
            <h2 className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase mb-3 font-light">
              Data Sources &amp; Public Domain Status
            </h2>
            <p>
              All artworks displayed on this platform are believed to be in the public domain based on
              available metadata from museum open-access APIs and Wikimedia Commons. Public domain
              determinations are made via automated compliance checks and may contain errors. Users
              should independently verify the public domain status of any artwork before reuse.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-[#161616] border border-[#232323]">
            <h2 className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase mb-3 font-light">
              AI-Generated Content
            </h2>
            <p>
              Descriptions, audio narrations, movement classifications, and gallery layouts are
              generated or enriched by automated AI agents. These outputs may contain inaccuracies,
              anachronisms, or omissions. They are not authoritative art-historical sources.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-[#161616] border border-[#232323]">
            <h2 className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase mb-3 font-light">
              No Security Certification
            </h2>
            <p>
              This prototype has not been audited, certified, or accredited under any security
              standard (including SOC 2, ISO 27001, or HIPAA). It is provided &quot;as is&quot;
              without warranty of any kind. Do not store sensitive or personal data on this platform.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-[#161616] border border-[#232323]">
            <h2 className="text-[#C8A96A] text-xs tracking-[0.12em] uppercase mb-3 font-light">
              Third-Party Content
            </h2>
            <p>
              Images are served from Wikimedia Commons and partner museum APIs. This platform does
              not claim ownership of any artwork images. All trademarks and copyrights remain the
              property of their respective owners.
            </p>
          </div>
        </section>

        <div className="gold-line my-10" />

        <p className="text-[#555] text-xs font-light text-center">
          Last updated: May 2026
        </p>
      </div>
    </div>
  );
}
