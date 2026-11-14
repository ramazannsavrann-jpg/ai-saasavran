// English public pages (default language of the site). Every number comes from our own measurements (Growth Lab, 7 Nov 2026)
// or from a cited source. Turkish versions live in content.mjs under /tr/ and /rehber/.

export const GUIDES_EN = [
  {
    slug: "measure-brand-visibility-in-chatgpt",
    tr: "chatgpt-marka-gorunurlugu-olcme",
    title: "How to measure your brand's visibility in ChatGPT",
    short: "Measure visibility in ChatGPT",
    description: "A step-by-step method to measure how often ChatGPT and Gemini mention and recommend your brand: question sets, repetition, live search and confidence ranges.",
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
<p>An assistant can answer from training data alone, or by searching the web first. The two modes can disagree sharply. In our own test, Tool A was recommended in 2 of 20 answers by Gemini without search, and in 8 of 20 by ChatGPT with live search, for the same 10 questions. A report should always say which mode it measured.</p>

<h2>5. Read results as a range</h2>
<p>40% recommended across 20 answers corresponds to a true rate somewhere around 22–61% (Wilson 95% interval). With small samples, "30% last week, 40% this week" is usually noise. Look at the trend over several measurements.</p>

<h2>A real example: our own brand</h2>
<p>We measured AI SaaSavran with our own tool: 10 questions, each asked twice, ChatGPT with live web search, 7 November 2026.</p>
<p class="small">Tool names are hidden; all five are established AI visibility tools.</p>
<table>
  <thead><tr><th>Brand</th><th>Recommended in</th><th>Own site cited in</th></tr></thead>
  <tbody>
    <tr><td>Tool A</td><td>8 / 20</td><td>7 / 20</td></tr>
    <tr><td>Tool B</td><td>7 / 20</td><td>6 / 20</td></tr>
    <tr><td>Tool C</td><td>7 / 20</td><td>6 / 20</td></tr>
    <tr><td>Tool E</td><td>6 / 20</td><td>1 / 20</td></tr>
    <tr><td>Tool D</td><td>5 / 20</td><td>5 / 20</td></tr>
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
  <li>Brands' own guide, blog and help pages (for example the help centres of established tools)</li>
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
<p>We asked ChatGPT (live web search) 10 questions like "What are the best tools to track brand visibility in AI answers?", twice each, on 7 November 2026. The most cited sources were the vendors' own pages: the tool vendors' own sites and help centres, plus help.openai.com and support.google.com.</p>
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
  {
    slug: "youtuber-ai-visibility",
    tr: "youtuber-yapay-zeka-gorunurlugu",
    title: "How YouTubers and content creators get recommended by ChatGPT",
    short: "AI visibility for creators",
    description: "Which channels does AI recommend when someone asks \"what's the best cooking channel?\" A measurement method and practical checklist for creators.",
    body: `
<p class="lede">Viewers now ask ChatGPT, Gemini and Claude things like "Can you recommend a good YouTube channel to learn investing?". The assistant usually names 3–5 channels. Being on that list is a new way to reach new viewers.</p>

<h2>How to measure it</h2>
<ol>
  <li>Write 10–20 questions your audience would ask (topic, level, format: "beginner", "short videos").</li>
  <li>Add your channel and 3–5 similar channels. Enter your channel as <b>youtube.com/@yourchannel</b>.</li>
  <li>Ask each question several times, ideally with live web search; look at how often your channel is <b>mentioned</b>, <b>recommended</b> and <b>cited</b>.</li>
  <li>Where you're not recommended, see which channel was named instead and which sites (list articles, forums, news) the AI read.</li>
</ol>

<h2>Checklist</h2>
<ul>
  <li><b>Channel and video descriptions:</b> say clearly what you cover and for whom.</li>
  <li><b>Captions/transcripts:</b> make your videos' text readable.</li>
  <li><b>Your own site or link page:</b> one page describing your channel and linking your profiles.</li>
  <li><b>"Best channels" lists:</b> get featured in list articles, forums and news; AI often cites these.</li>
  <li><b>Consistent name:</b> spell your channel name the same everywhere.</li>
</ul>
<p>In AI SaaSavran, the "Content creator" sectors come with ready-made questions, and your channel URL is recognized separately in the owned-source share (other channels aren't counted as yours).</p>
`,
    faq: [
      ["Does AI cite YouTube videos?", "Yes, in live web search YouTube videos and channel pages can be cited. List articles, forums and news sites often matter just as much."],
      ["Does the channel with the most subscribers always win?", "No. The AI looks at fit to the question and what's on the web; a smaller but clearly focused channel can stand out for specific questions."],
    ],
  },
  {
    slug: "choose-ai-visibility-tool",
    tr: "yapay-zeka-gorunurluk-araci-secimi",
    title: "How to choose an AI visibility (GEO) tracking tool: 9 questions to ask",
    short: "Choosing an AI visibility tool",
    description: "What to check before you pick a tool that tracks your brand in ChatGPT, Gemini and Claude: engines, live search, repetition, sources, language and cost.",
    body: `
<p class="lede">Short answer: a good AI visibility tool asks the questions your customers ask, <b>several times</b>, in <b>each AI engine separately</b>, tells you whether the answer came from <b>live web search or the model's memory</b>, and shows <b>which sources</b> the AI relied on. Mention counts alone are not enough. Below are the 9 questions we suggest asking any tool, including ours.</p>

<h2>1. Which AI engines does it measure, and are they reported separately?</h2>
<p>ChatGPT, Gemini, Claude and others often recommend different brands for the same question. In our own phone measurement, one brand was recommended in 10 of 16 Claude answers and in none of ChatGPT's 16. A single blended "AI score" hides this. Ask for per-engine results.</p>

<h2>2. Live web search or model knowledge?</h2>
<p>An answer built from live search reflects today's web; an answer from model knowledge reflects older training data. Both matter, but they should never be mixed silently. The report should label every measurement.</p>

<h2>3. How many times is each question asked?</h2>
<p>AI assistants give different answers to the same question. One answer per question is an anecdote, not a measurement. Look for repetition and a range or confidence note, not a single exact-looking percentage.</p>

<h2>4. Does it separate mention, recommendation and citation?</h2>
<p>"Brand X is expensive" is a mention, not a recommendation. Being cited as a source is a third, different signal. A tool should count these separately.</p>

<h2>5. Does it show the sources behind the answers?</h2>
<p>Visibility is fixed off-site: review sites, comparison articles, forums, directories. You need the cited URLs, and ideally the split between your own site, competitors' sites and third-party sites.</p>

<h2>6. Can it ask in your customers' language and country?</h2>
<p>Answers to a Turkish question asked from Turkey can differ from an English question asked from the US. If your customers are local, the questions and search location must be local too.</p>

<h2>7. Does it explain why a competitor was chosen?</h2>
<p>Counting is step one. Useful tools also show which competitor was named instead of you, for which question, and what reason or source the AI gave.</p>

<h2>8. Does it check product-level facts?</h2>
<p>For product brands, the AI may quote the wrong price or spec. Checking claims against official data, and comparing with shopping results, catches problems that brand-level counts miss.</p>

<h2>9. Is the cost transparent?</h2>
<p>Live-search queries cost money for every tool. Check what the free plan really includes, how many questions and measurements you get, whether agencies can manage several brands, and whether usage limits stop before surprise costs.</p>

<h2>Where AI SaaSavran fits</h2>
<p>AI SaaSavran asks your customers' questions in Turkish or English and reports each engine separately. The free plan uses Gemini without live web search and labels it clearly; paid plans add ChatGPT and Claude with live web search and the sites they cited. Reports separate mention, recommendation and citation, show competitor comparisons and source shares, and include product accuracy checks. Plans are Free, Plus $29, Pro $149 and Business $449 a month. Perplexity is not supported yet, and we are in early access.</p>
`,
    faq: [
      ["What is the most important feature of an AI visibility tool?", "Per-engine results built from repeated questions, with each answer labelled as live web search or model knowledge, plus the sources the AI cited."],
      ["Can I measure AI visibility for free?", "Partly. Free plans usually use model knowledge without live search or a small number of questions. AI SaaSavran's free plan includes 1 brand, 15 questions and 4 measurements a month on Gemini without live search."],
      ["Why do different AI engines give different results?", "They use different search providers, sources and training data. In our measurements the same brand was recommended often by one engine and never by another."],
    ],
  },
  {
    slug: "ai-visibility-tracking-for-agencies",
    tr: "ajanslar-icin-yapay-zeka-gorunurluk-takibi",
    title: "How agencies track client brands in AI assistants",
    short: "AI visibility tracking for agencies",
    description: "How an agency can track whether client brands are recommended in ChatGPT, Gemini and Claude: a question set per brand, regular runs, reports and team access.",
    body: `
<p class="lede">Short answer: an agency builds a separate set of customer-style questions for each client brand, has each AI engine answer them <b>on a regular schedule</b> and <b>several times</b>, and reports the result next to the brand's competitors. Doing this by hand stops scaling once you manage a few brands. You need an AI visibility tool that holds many brands in one account, gives team members their own access, and produces a report you can send to the client.</p>

<h2>1. Keep every client brand separate</h2>
<p>Each brand has its own sector, competitors and customer questions. A dental clinic's questions ("Which clinic for implants in my city?") and an online shoe store's questions ("Recommend running shoes under $80") don't belong in the same report. Keep a question set, a competitor list and a report per brand.</p>

<h2>2. Leave the brand name out of most questions</h2>
<p>"Is X any good?" always makes the AI talk about X and gives a flattering result. Your client's customers ask without knowing the brand: "best", "which one", "can you recommend". Use branded questions only sparingly, to check whether the AI describes the brand correctly.</p>

<h2>3. Measure regularly and repeatedly</h2>
<p>An AI can give a different answer to the same question each time. A single screenshot is not a result you can present. Ask each question several times, repeat on a fixed schedule such as weekly, and show the trend. You want to notice a sudden drop before the client does.</p>

<h2>4. Report each engine separately</h2>
<p>ChatGPT, Gemini and Claude can recommend different brands for the same question. Show results per engine instead of one blended score, and say whether an answer came from live web search or from the model's training data; the two tell different stories.</p>

<h2>5. Answer "why?" with evidence</h2>
<p>The client will ask why a competitor was recommended. Show the sentence in which the AI praised the competitor, the sources it relied on and the questions the brand lost. The work plan comes from that evidence: which page lacks information, which comparison site the brand should appear on.</p>

<h2>6. Team access and a report you can send</h2>
<p>Several people at an agency work on the same brands, and sharing one password is not safe. Give each person their own access. Send the client a read-only report link that needs no login, or a PDF.</p>

<h2>7. Tie the work to the measurements</h2>
<p>When you publish content or list the brand in a directory, note the date. If later measurements move, you can tell the client what changed after which action. If nothing moves, say so honestly; changes in AI answers can take weeks.</p>

<h2>What AI SaaSavran offers agencies</h2>
<p>In AI SaaSavran you can open your workspace as an "Agency" and add client brands one by one. The Pro plan covers 5 brands and a team of 3; the Business plan covers 15 brands and a team of 15. Each brand gets its own questions, competitors, weekly automatic measurement, an email alert on a significant drop, per-engine reports, cited sources, PDF export and a shareable report link. On Pro and Business, results can also flow into your own dashboards through the API and MCP. You can start by trying one brand on the free plan.</p>
`,
    faq: [
      ["How many client brands can an agency track in one account?", "In AI SaaSavran the Pro plan includes 5 brands and the Business plan 15. Each brand has its own questions, competitor list and report."],
      ["How do I send a report to a client?", "Share a read-only report link that needs no login, or download the report as a PDF."],
      ["Can teammates work on the same brands?", "Yes. Pro gives access to 3 people and Business to 15, each with their own login, so nobody shares a password."],
    ],
  },
];

export const HOME_FAQ_EN = [
  ["Is AI SaaSavran related to other companies with a similar name?", "No. AI SaaSavran is the AI visibility measurement tool at aisaasavran.com. It is an independent product with its own plans (Free, Plus $29, Pro $149, Business $449 a month) and is not affiliated with similarly named companies or services. If an AI assistant describes different plans or a different business under our name, it is describing someone else."],
  ["What does AI SaaSavran do?", "It asks ChatGPT and Gemini the questions your customers would ask, and measures whether your brand is mentioned, recommended or cited as a source, compared with your competitors."],
  ["Is it free?", "The free plan includes 1 brand, 15 questions and 4 measurements a month. Paid plans are Plus $29, Pro $149 and Business $449 a month, billed monthly and cancellable anytime. Free-plan measurements use Gemini without live web search, and reports say so clearly."],
  ["Which AI assistants are measured?", "Free plan: Gemini without live web search (not available in the EEA, Switzerland and the UK). Paid plans add ChatGPT and Claude with live web search, including the sites they cited. Perplexity is not supported yet. Reports show each engine separately."],
  ["Is the product ready?", "We are in early access: the product works, but it is new and run by a small team. We list exactly what works and what doesn't on this page."],
];
