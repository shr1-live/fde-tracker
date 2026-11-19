import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";

/** Any address the app does not know. */
export default function NotFound() {
  return (
    <div className="content">
      <div className="notfound">
        <p className="nf-code" aria-hidden="true">404</p>
        <h1>This page does not exist</h1>
        <p className="page-sub">The link may be old or mistyped, or the page was moved. Your programs are in the menu.</p>
        <div className="row center">
          <Link className="btn" to="/"><Icon name="rss" size={16} />Go to the feed</Link>
          <button type="button" className="btn secondary" onClick={() => window.history.back()}><Icon name="left" size={16} />Go back</button>
        </div>
      </div>
    </div>
  );
}
