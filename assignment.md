>_ Engineering take-home
SOFTWARE ENGINEERING · BUILD, THEN DEMO
This isn't an
assignment.
It's the job.
The exact work you'll do inside the team — building real
automation that companies pay for. Ship it, then demo
it live.
Sourcing → Mailing Zero humans in the loop
01 It's the real job
Build a fully automated cold-outreach pipeline, sourcing through mailing.
02 Yours to keep
Even if you aren't hired, you walk away with a working, end-to-end product
for your portfolio.
→ One input, then hands off
A human types a single company.domain . The system does everything
after that, on its own — demoed live in the interview.
THE PIPELINE YOU'LL BUILD
One input. Four stages. A full outreach engine.
1 HUMAN INPUT company.domain
1 Ocean.io
Find lookalike companies
seed domain → similar company domains
→
2 Prospeo
Find decision-makers
domains → C-suite / VP + LinkedIn URLs
→
3 Eazyreach
Resolve work email IDs
LinkedIn URLs → verified work emails
→
4 Brevo
Send personalized outreach
emails → outreach mail sent
HOW IT RUNS, STAGE BY STAGE
IN A human provides one seed domain — a company you already know is a strong customer. That single string is
the only manual input the system ever receives.
01 Ocean.io expands the seed into a list of lookalike companies — similar firmographics, size, and market.
Output: a clean list of company domains.
02 Prospeo takes each company domain and surfaces the decision-makers — C-suite and VP-level — together
with their LinkedIn profile URLs.
03 Eazyreach resolves each LinkedIn profile into a verified work email, so every address you mail is real and
deliverable.
04 Brevo sends each contact a personalized outreach email. The copy and pitch are yours; the pipeline only has
to fire them on its own.
→ Every stage's output is the next stage's input. No human touches the data in between — that hand-off-free
chain is the entire point.
WHAT "DONE" LOOKS LIKE
› Build it as a single command-line program that runs all four stages end
to end.
› Each stage feeds the next automatically — no copy-paste, no manual
handoffs.
› Half the job is reading each tool's API docs — auth, endpoints,
request/response shapes, and limits all live there.
› The outreach email copy is entirely yours. We only care that the
pipeline sends it automatically.
★ A sensible build adds one safety checkpoint — show a summary
before the emails actually fire.
EVALUATION & THE INTERVIEW
What we look for, and the live demo.
EVALUATION CRITERIA
✓ It runs end to end
One domain in, all four stages fire — zero manual steps after the input.
✓ Integrations done right
Auth, pagination, and error handling wired correctly against each tool's real API.
✓ Clean, modular code
One stage is one clear unit — readable, separable, and easy to extend.
✓ Resilient to messy data
Missing contacts, rate limits, and partial failures don't crash the run.
✓ Good judgment
A safety checkpoint before emails fire, plus sensible defaults throughout.
★ Bonus · sharp email copy
Personalized outreach you'd actually open beats a generic blast.
IN THE INTERVIEW
1 Run it live. Enter a domain and we watch the pipeline execute end to end.
2 Walk the code. Talk us through your structure and the API decisions you made.
3 Edge cases. Expect questions on rate limits, de-duplication, and undeliverable
emails.
4 Live tweak. We may ask you to change or extend a stage on the spot.
5 Be honest. A working slice you can explain beats a broken whole you can't.
SETUP · DO THIS BEFORE YOU CODE
Get your domain & accounts.
STEP 01
Get a domain first
The domain is the only paid item. Everything else is free.
STEP 02
Create accounts
Namecheap Ocean.io Prospeo Eazyreach
Brevo
STEP 03
Order matters
THE GOTCHA
Domain first
01
Get domain
Student Pack or Namecheap
→
02
Company email
you@yourdomain
→
03
Sign up Ocean.io
using that company email
→
04
Other accounts
Prospeo, Eazyreach, Brevo
Free: claim one via the GitHub Student Developer
Pack.
No student pack? Buy the cheapest domain on
Namecheap.
We reimburse Namecheap — submit a payment
screenshot + your UPI ID in the form.
All free, APIs included. Namecheap is the only paid
one — and it's reimbursed.
Eazyreach credits are on us — create the account,
send us your details, we top it up.
Ocean.io needs a company email to sign up.
No domain → no company email → can't create
Ocean.io.
So the domain genuinely has to come first. Don't skip
ahead.
LINKS & HELP
Everything you need.
REIMBURSEMENT
Domain form
Screenshot of payment + UPI ID
forms.gle/24Sui9bUX9yS3Qxx7
TOOL SIGNUPS
Namecheap namecheap.com
Ocean.io ocean.io
Prospeo app.prospeo.io/api
Eazyreach eazyreach.app
Brevo app.brevo.com
DOUBTS? REACH OUT
WhatsApp · +91 99400 91513
Read the flow end to end first,
then the docs, then write code.