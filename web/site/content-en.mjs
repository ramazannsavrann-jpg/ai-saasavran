// English public pages (default language of the site). Every number comes from our own measurements (Growth Lab, 7 Nov 2026)
// or from a cited source. Turkish versions live in content.mjs under /tr/ and /rehber/.

export const GUIDES_EN = [
  {
    slug: "measure-brand-visibility-in-chatgpt",
    tr: "chatgpt-marka-gorunurlugu-olcme",
    title: "How to measure your brand's visibility in ChatGPT",
    short: "Measure visibility in ChatGPT",
    description: "A step-by-step method to measure how often ChatGPT and Gemini mention and recommend your brand: question sets, repetition, live search vs. model knowledge, and confidence ranges.",
    body: `
<p class="lede">Short answer: write 10–30 questions your customers would ask an AI assistant, ask each one several times, and count how often your brand is <b>mentioned</b>, <b>recommended</b> and <b>cited as a source</b>. Never judge from a single answer; assistants give different answers to the same question.</p>

<h2>1. Write questions the way customers ask</h2>
<p>Questions that contain your brand name ("Is X any good?") are misleading, because the assistant will talk about whatever brand you name. What matters are the unbranded questions:</p>
<ul>
  <li><b>Local:</b> "Can you recommend a family-friendly pizza place in Austin?"</li>
  <li><b>Comparison:</b> "What's the best project management tool for a 5-person agency?"</li>
  <li><b>Purchase:</b> "Which CRM should a small real-estate team buy?"</li>
  <li><b>Research:</b> "How do I track my brand's visibility in AI answers?"</li>
</ul>

<h2>2. Ask every question more than once</h2>
<p>Language models are probabilistic. The same question can recommend you once and your competitor the next time. Ask each question at least twice and read the result as a rate: being recommended in 8 of 20 answers says far more than one lucky answer.</p>

<h2>3. Count three things separately</h2>
<dl class="defs">
  <dt>Mentioned</dt><dd>Is your brand named anywhere in the answer?</dd>
  <dt>Recommended</dt><dd>Is it in a recommendation list, or named with phrases like "I'd recommend" or "best option"? "X is not recommended" does not count.</dd>
  <dt>Cited</dt><dd>Did the assistant use your website as a source? Only measurable when the answer used live web search.</dd>
</dl>

<h2>4. Don't mix live search and model knowledge</h2>
<p>An assistant can answer from training data alone, or by searching the web first. The two modes can disagree sharply. In our own test, Peec AI was recommended in 2 of 20 answers by Gemini without search, and in 8 of 20 by ChatGPT with live search, for the same 10 questions. A report should always say which mode it measured.</p>

<h2>5. Read results as a range</h2>
<p>40% recommended across 20 answers corresponds to a true rate somewhere around 22–61% (Wilson 95% interval). With small samples, "30% last week, 40% this week" is usually noise. Look at the trend over several measurements.</p>

<h2>A real example: our own brand</h2>
<p>We measured AI SaaSavran with our own tool: 10 questions, each asked twice, ChatGPT with live web search, 7 November 2026.</p>
<table>
  <thead><tr><th>Brand</th><th>Recommended in</th><th>Own site cited in</th></tr></thead>
  <tbody>
    <tr><td>Peec AI</td><td>8 / 20</td><td>7 / 20</td></tr>
    <tr><td>Otterly.AI</td><td>7 / 20</td><td>6 / 20</td></tr>
    <tr><td>Semrush</td><td>7 / 20</td><td>6 / 20</td></tr>
    <tr><td>Profound</td><td>6 / 20</td><td>1 / 20</td></tr>
    <tr><td>Ahrefs</td><td>5 / 20</td><td>5 / 20</td></tr>
    <tr class="us"><td>AI SaaSavran</td><td>0 / 20</td><td>0 / 20</td></tr>
  </tbody>
</table>
<p>As a new brand we start from zero. That is why this guide exists: the brands that show up are cited through the guides and help pages on their own sites.</p>
`,
    faq: [
      ["Can I measure my ChatGPT visibility for free?", "Yes. Ask the questions by hand and log the answers in a spreadsheet. AI SaaSavran's free plan automates this with Gemini (without live search)."],
      ["How many questions are enough?", "Start with 10 unbranded questions and at least 2 answers per question. Treat anything under 20 answers as a hint, not a result."],
      ["Why does the AI give different answers each time?", "Models are probabilistic, and with live search the pages found also change. That is why visibility is measured as a rate, not from one answer."],
    ],
  },
  {
    slug: "ai-visibility-tools-compared",
    tr: "yapay-zeka-gorunurluk-araclari",
    title: "AI visibility tools compared: Peec AI, Otterly, Profound, Semrush, Ahrefs",
    short: "AI visibility tools compared",
    description: "Who each AI visibility (GEO/AEO) tracker is for, what it measures and what it costs to start, with a checklist for choosing one.",
    body: `
<p class="lede">AI visibility tools measure how often your brand appears in answers from assistants like ChatGPT, Gemini and Perplexity. Below is a short summary based on public product pages and independent comparisons. Prices change often; check each vendor's site.</p>
<p class="disclosure">Disclosure: written by the AI SaaSavran team. We included our own tool and listed what it does not do yet.</p>

<h2>Who each tool is for</h2>
<table>
  <thead><tr><th>Tool</th><th>Cheapest paid plan*</th><th>Best for</th></tr></thead>
  <tbody>
    <tr><td>Otterly.AI</td><td>£23 / month</td><td>Small and mid-size teams; prompt-level tracking and sentiment</td></tr>
    <tr><td>Peec AI</td><td>€89 / month</td><td>Mid-size marketing teams, strong in Europe</td></tr>
    <tr><td>Semrush</td><td>£79 / month (SEO suite)</td><td>SEO teams already on Semrush</td></tr>
    <tr><td>Ahrefs</td><td>£79 / month (SEO suite)</td><td>SEO teams already on Ahrefs</td></tr>
    <tr><td>Profound</td><td>£399 / month</td><td>Enterprises; many engines, benchmarks and workflows</td></tr>
    <tr class="us"><td>AI SaaSavran</td><td>Free plan available</td><td>Small businesses and small agencies who want an honest, simple measurement</td></tr>
  </tbody>
</table>
<p class="small">*Starting prices as of April 2026 from <a href="https://seocompare.pages.dev/blog/tool-pricing-comparison-q2-2026/">SEOCompare's Q2 2026 comparison</a>; may have changed.</p>

<h2>How to choose</h2>
<ul>
  <li><b>Live search or model knowledge?</b> Does the tool measure answers where the AI searched the web, or only what the model already knows? The report should say.</li>
  <li><b>Repetition and confidence:</b> Is each question asked more than once? Rates from single answers mislead.</li>
  <li><b>Source analysis:</b> Does it show which websites the AI relied on? That tells you what to do next.</li>
  <li><b>Brand matching:</b> Are product names and shared names handled? (A card program used by several banks should not be credited to one of them.)</li>
  <li><b>Cost controls:</b> Is there a hard monthly spending cap on paid measurements?</li>
</ul>

<h2>AI SaaSavran today (honest status)</h2>
<ul>
  <li>Works: brand, competitor and question management, Gemini measurement without search, weekly automatic runs, website check, rule-based recommendations.</li>
  <li>In trial: ChatGPT live-search measurement and source analysis (not yet open to customers).</li>
  <li>Not yet: Perplexity, PDF reports, payments, English app interface (coming).</li>
</ul>
`,
    faq: [
      ["What is the cheapest AI visibility tool?", "Prices change often; check vendors directly. Among established tools Otterly.AI starts low. AI SaaSavran has a free plan."],
      ["What are affordable alternatives to Profound?", "Independent comparisons often name Peec AI and Otterly.AI for mid-size teams. For small businesses that want to start free, AI SaaSavran is an option."],
      ["Do I need an AI visibility tool or can I do it by hand?", "For a handful of questions, by hand works. A tool helps once you track 10+ questions weekly, compare competitors, and need consistent counting."],
    ],
  },
  {
    slug: "what-is-geo",
    tr: "geo-nedir",
    title: "What is GEO (Generative Engine Optimization)? A short guide for businesses",
    short: "What is GEO",
    description: "GEO is the work of getting your brand mentioned and recommended in AI assistants' answers. How it differs from SEO, how it's measured, and five first steps.",
    body: `
<p class="lede">GEO (Generative Engine Optimization) is the work of getting your brand mentioned and recommended in answers from AI assistants such as ChatGPT, Gemini and Perplexity. AEO (Answer Engine Optimization) is used in a similar sense.</p>

<h2>How is it different from SEO?</h2>
<table>
  <thead><tr><th></th><th>SEO</th><th>GEO</th></tr></thead>
  <tbody>
    <tr><td>Goal</td><td>Rank high on the search results page</td><td>Be named and recommended inside the AI's answer</td></tr>
    <tr><td>What the user sees</td><td>Ten links</td><td>One answer, usually 3–5 suggestions</td></tr>
    <tr><td>How it's measured</td><td>Rankings, clicks</td><td>Mention, recommendation and citation rates</td></tr>
  </tbody>
</table>
<p>They are not rivals: assistants with live search read web pages before answering, so good SEO is the foundation of GEO.</p>

<h2>What does the AI rely on?</h2>
<p>In our live-search measurements, ChatGPT most often cited:</p>
<ul>
  <li>Brands' own guide, blog and help pages (for example semrush.com, peec.ai, help.ahrefs.com)</li>
  <li>Official bodies and reports (for banking questions: regulators and audit-firm reports)</li>
  <li>Comparison and review sites</li>
</ul>

<h2>Five first steps</h2>
<ol>
  <li>Write 10 unbranded questions your customers would ask an AI and measure where you stand today.</li>
  <li>Make sure your robots.txt does not block AI crawlers (GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended).</li>
  <li>Publish pages that answer those questions directly, with clear headings (FAQs, guides).</li>
  <li>State concrete differentiators on your site: price range, service area, specialties, awards.</li>
  <li>Re-measure the same questions a few weeks later and compare.</li>
</ol>
`,
    faq: [
      ["Is GEO the same as SEO?", "No, but they are connected. SEO targets search rankings, GEO targets being part of the AI's answer. Because live-search assistants read the web, good SEO helps GEO."],
      ["How long does GEO take to work?", "With live-search assistants, changes on your site can show up within weeks. Changes in pure model knowledge wait for new model training and can take months."],
    ],
  },
  {
    slug: "local-business-ai-recommendations",
    tr: "yerel-isletme-yapay-zeka",
    title: "How local businesses get recommended by ChatGPT and Gemini",
    short: "Local businesses and AI",
    description: "A practical checklist for restaurants, clinics, auto repair shops, real-estate agents and other local businesses to show up in AI assistants' recommendations.",
    body: `
<p class="lede">Customers now ask assistants things like "Can you recommend a good dentist near downtown?" The AI answers with 3–5 business names. To be on that list:</p>

<h2>Checklist</h2>
<ol>
  <li><b>Google Business Profile:</b> name, address, phone and opening hours complete and current. Live-search assistants rely on this information often.</li>
  <li><b>Same details everywhere:</b> your business name and address written the same way on your site, maps and directories.</li>
  <li><b>City and service on your site:</b> say in a plain sentence where you are and what you do, like "family-run pizza restaurant in East Austin".</li>
  <li><b>An FAQ page:</b> answer what customers really ask (price range, bookings, parking, delivery).</li>
  <li><b>Reviews:</b> ask happy customers for reviews. "Well-reviewed" appears often in AI answers.</li>
  <li><b>Allow AI crawlers:</b> your robots.txt should not block GPTBot, OAI-SearchBot or PerplexityBot.</li>
  <li><b>Structured data:</b> add schema.org LocalBusiness markup (address, phone, hours).</li>
</ol>
<p>AI SaaSavran's website check covers several of these automatically and lists what's missing in the Recommendations tab.</p>

<h2>Measure before you change things</h2>
<p>See where you stand first: which questions mention you, and which ones recommend a competitor instead. Re-measure the same questions a few weeks after making changes.</p>
`,
    faq: [
      ["Does AI visibility matter for a small business?", "Yes. Assistants usually suggest only a few businesses per question; not being on the list means never being seen by that customer."],
      ["Can I pay to appear in AI recommendations?", "No. Recommendations in AI answers are not ads; they come from web information and model knowledge. Accurate, consistent information matters most."],
    ],
  },
  {
    slug: "why-chatgpt-recommends-your-competitor",
    tr: "rakip-neden-oneriliyor",
    title: "Why does ChatGPT recommend your competitor? Find out with source analysis",
    short: "Why your competitor is recommended",
    description: "When ChatGPT answers with live web search it shows the pages it used. Reading those sources is the fastest way to learn why a competitor gets recommended.",
    body: `
<p class="lede">When ChatGPT searches the web before answering, it shows the pages it used as sources. Looking at the sources behind answers that recommend your competitor is the fastest way to understand why.</p>

<h2>A real example: our own category</h2>
<p>We asked ChatGPT (live web search) 10 questions like "What are the best tools to track brand visibility in AI answers?", twice each, on 7 November 2026. The most cited sources were the vendors' own pages: semrush.com, help.openai.com, peec.ai, support.google.com, help.ahrefs.com, help.otterly.ai and blog.hubspot.com.</p>
<p>The lesson: the tools that were recommended most also had their own help docs and guides cited. Clear, specific pages that answer the exact question get used as sources. One measurement with few answers is a hint, not a final ranking.</p>

<h2>Your own competitor analysis in four steps</h2>
<ol>
  <li>Find the questions where your competitor is recommended and you are not.</li>
  <li>List the sources cited in those answers.</li>
  <li>If the source is the competitor's own site, read that page: which question does it answer, what evidence does it give? If it is a guide or comparison site, find a way to be included there.</li>
  <li>Publish a page on your site that answers the same question more clearly and with evidence.</li>
</ol>
`,
    faq: [
      ["How do I see which sites ChatGPT used?", "When ChatGPT searches the web, it shows source links in or under the answer. AI SaaSavran's live-search measurement saves these sources for every answer and lists the most cited sites."],
    ],
  },
];

export const HOME_FAQ_EN = [
  ["What does AI SaaSavran do?", "It asks ChatGPT and Gemini the questions your customers would ask, and measures whether your brand is mentioned, recommended or cited as a source, compared with your competitors."],
  ["Is it free?", "The free plan includes 1 brand, 15 questions and 100 answers a month. Paid plans are Plus $20, Pro $99 and Business $249 a month; they are not on sale yet and have a waitlist. Free-plan measurements use Gemini without live web search, and reports say so clearly."],
  ["Which AI assistants are measured?", "Gemini today (without live search). ChatGPT with live web search is in a trial phase and not yet open to customers. Perplexity is not supported yet."],
  ["Is the product ready?", "We are in early access. The app interface is being translated to English. We list exactly what works and what doesn't on this page."],
];
