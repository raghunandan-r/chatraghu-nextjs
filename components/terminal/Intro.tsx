import { BANNER_large, BANNER_small } from './constants';

export default function Intro({ yearsSince2013 }: { yearsSince2013: string }) {

  return (
    <div className="intro-block" aria-hidden="false">
      <pre id="banner-large">{BANNER_large}</pre>
      <pre id="banner-small">{BANNER_small}</pre>
      <div className="help">
        <div className="col intro">
          <p className="intro-line">Pronounced like the pasta sauce, just with a different accent.</p>
          <p className="intro-line">I&apos;m based in nyc and I&apos;ve been building things for {yearsSince2013} years.</p>

          <p className="intro-section"><strong>I&apos;m currently...</strong></p>
          <ul className="intro-list">
            <li>working at <a href="https://www.housingpartnership.net/" target="_blank" className="intro-link" rel="noreferrer">HPN</a>, setting up the data stack for affordable housing</li>
          </ul>

          <p className="intro-section"><strong>Previously I...</strong></p>
          <ul className="intro-list">
            <li>graduated from <a href="https://www.rit.edu/" target="_blank" className="intro-link" rel="noreferrer">Rochester Institute of Technology</a> with a MSc in Data Science</li>
            <li>interned at <a href="https://www.micron.com/" target="_blank" className="intro-link" rel="noreferrer">Micron</a>, where I built data tools</li>
            <li>worked on <a href="https://www.freshworks.com/" target="_blank" className="intro-link" rel="noreferrer">b2b SaaS</a></li>
             <li><a href="https://www.lynk.co.in/" target="_blank" className="intro-link" rel="noreferrer">hyperlocal delivery</a>
            and  <a href="https://www.bankbazaar.com/" target="_blank" className="intro-link" rel="noreferrer">FinTech</a></li>
            <li>started out as a Developer at <a href="https://www.dxc.com/" target="_blank" className="intro-link" rel="noreferrer">DXC</a></li>
          </ul>

          <p className="intro-section"><strong>Projects I&apos;ve worked on...</strong></p>
          <ul className="intro-list">            
            <li><a href="https://app.hex.tech/019794be-cfa2-700a-986e-d228edf3c6bf/hex/Evaluating-AI-at-raghufyi-030GQtNRWQfVqmkZFcpXFp/draft/logic?view=notebook" target="_blank" className="intro-link" rel="noreferrer">know-your-rights</a> - backend engine with RAG, built with FastAPI, OpenRouter &amp; Pinecone</li>
            {/* <li><a href="https://github.com/raghunandan-r/chatraghu-gcp-elt-pipeline" target="_blank" className="intro-link" rel="noreferrer">chatRaghu_elt</a> - viz and LLM-as-judge evals, built with GCP, BigQuery, dbt &amp; Hex</li> */}
          </ul>          
          <p className="intro-section spaced"><strong>Questions? Ask away!</strong></p>
        </div>
        <div className="col">
          <span className="cmd">Type to start</span>
          <span className="desc">Enter to send</span>
        </div>
        <div className="col">
          <span className="cmd">↑/↓</span>
          <span className="desc">history</span>
        </div>
      </div>
    </div>
  );
}


