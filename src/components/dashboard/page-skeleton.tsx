import styles from './page-skeleton.module.css';

type SkeletonVariant = 'agenda' | 'list' | 'settings' | 'schedule';

function Line({ short = false }: { short?: boolean }) {
  return <span className={`${styles.line} ${short ? styles.short : ''}`} />;
}

/** Server-only markup: shared structure, no timers, requests or hydration. */
export function PageSkeleton({ title, variant = 'list' }: { title: string; variant?: SkeletonVariant }) {
  return <section aria-busy="true" aria-label={`Cargando ${title.toLowerCase()}`}>
    <span className="sr-only" role="status">Cargando {title.toLowerCase()}…</span>
    <div className={styles.skeleton} aria-hidden="true">
      <header className={styles.heading}>
        <div><h1>{title}</h1><Line /></div>
        <span className={styles.control} />
      </header>
      {variant === 'agenda' && <div className={styles.metrics}>
        {[0, 1, 2].map(index => <div key={index}><Line short /><span className={styles.value} /><Line /></div>)}
      </div>}
      <div className={variant === 'settings' || variant === 'schedule' ? styles.columns : undefined}>
        <div className={styles.surface}>
          {(variant === 'agenda' || variant === 'schedule') && <div className={styles.toolbar}><span className={styles.control} /><span className={styles.control} /></div>}
          {[0, 1, 2, 3].map(index => <div className={styles.row} key={index}>
            {variant === 'agenda' && <span className={styles.time} />}
            <div className={styles.copy}><Line short /><Line /></div>
            <span className={styles.control} />
          </div>)}
        </div>
        {(variant === 'settings' || variant === 'schedule') && <div className={styles.surface}>
          {[0, 1, 2].map(index => <div className={styles.field} key={index}><Line short /><span className={styles.input} /></div>)}
        </div>}
      </div>
    </div>
  </section>;
}
