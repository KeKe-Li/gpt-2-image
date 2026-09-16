import { Link } from 'react-router-dom';
import { publicSiteConfig } from '../lib/runtimeConfig';

export default function BrandMark({ config = publicSiteConfig, compact = false }) {
  return (
    <Link
      className={`brand-mark${compact ? ' brand-mark--compact' : ''}`}
      to="/"
      aria-label={`${config.brandName} ${config.brandNameEn}`}
    >
      <span className="brand-mark__symbol" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand-mark__copy">
        <strong>{config.brandName}</strong>
        <small>{config.brandNameEn}</small>
      </span>
    </Link>
  );
}
