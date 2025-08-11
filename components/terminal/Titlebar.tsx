import { GitIcon, LinkedInIcon, GmailIcon, FileIcon } from '@/components/icons';

export default function Titlebar() {
  return (
    <div className="titlebar">
      <nav className="nav">
        <a href="https://github.com/raghunandan-r" target="_blank" className="social-link" rel="noreferrer">
          <GitIcon />
          github
        </a>
        <a href="mailto:raghunandan092@gmail.com" target="_blank" className="social-link" rel="noreferrer">
          <GmailIcon />
          mail
        </a>
        {/* <a href="/resume.pdf" target="_blank" className="social-link" rel="noreferrer">
          <FileIcon />
          resume
        </a> */}
        <a href="https://www.linkedin.com/in/raghudan/" target="_blank" className="social-link" rel="noreferrer">
          <LinkedInIcon />
          linkedin
        </a>
      </nav>
    </div>
  );
}


