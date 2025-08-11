import { useMemo } from 'react';
import { BANNER_large, BANNER_small } from './constants';

export default function Intro() {
  const yearsSince2013 = useMemo(() => {
    const start = new Date('2013-08-13T00:00:00Z');
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.2425) - 2.5;
    return years.toFixed(1);
  }, []);

  return (
    <div className="intro-block" aria-hidden="false">
      <pre id="banner-large">{BANNER_large}</pre>
      <pre id="banner-small">{BANNER_small}</pre>
      <div className="help">
        <div className="col intro">
          <p className="intro-line">I&apos;m based in nyc.</p>
          <p className="intro-line">I&apos;ve been building things for {yearsSince2013} years.</p>

          <p className="intro-section"><strong>I&apos;m currently...</strong></p>
          <ul className="intro-list">
            <li>volunteering at <a href="https://chieac.org/chicagodatascience" target="_blank" className="intro-link" rel="noreferrer">CHIEAC</a>, helping build GenAI tools for the community</li>
          </ul>

          <p className="intro-section"><strong>Previously I...</strong></p>
          <ul className="intro-list">
            <li>graduated from <a href="https://www.rit.edu/" target="_blank" className="intro-link" rel="noreferrer">Rochester Institute of Technology</a> with a MSc in Data Science</li>
            <li>built data tools for RevOps at <a href="https://www.micron.com/" target="_blank" className="intro-link" rel="noreferrer">Micron</a></li>
            <li>worked on b2b SaaS at <a href="https://www.freshworks.com/" target="_blank" className="intro-link" rel="noreferrer">Freshworks</a></li>
            <li>worked on hyperlocal delivery at <a href="https://www.lynk.co.in/" target="_blank" className="intro-link" rel="noreferrer">Lynk</a></li>
            <li>worked on FinTech at <a href="https://www.bankbazaar.com/" target="_blank" className="intro-link" rel="noreferrer">Bankbazaar</a></li>
            <li>started out as a Developer at <a href="https://www.dxc.com/" target="_blank" className="intro-link" rel="noreferrer">DXC</a></li>
          </ul>

          <p className="intro-section"><strong>Projects I&apos;m working on...</strong></p>
          <ul className="intro-list">
            <li><a href="https://raghu.fyi" target="_blank" className="intro-link" rel="noreferrer">raghu.fyi</a> - website to talk about my work, built with Next.js</li>
            <li><a href="https://github.com/raghunandan-r/chatRaghu-backend" target="_blank" className="intro-link" rel="noreferrer">chatRaghu</a> - backend engine with RAG, built with FastAPI, OpenAI &amp; Pinecone</li>
            <li><a href="https://github.com/raghunandan-r/chatraghu-gcp-elt-pipeline" target="_blank" className="intro-link" rel="noreferrer">chatRaghu_elt</a> - real-time evals built with GCP, BigQuery, dbt &amp; Hex</li>
          </ul>
          <p className="intro-section"><strong>Questions? Ask away!</strong></p>
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


