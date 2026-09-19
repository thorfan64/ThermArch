/** Shared sheet panel. Caps titles read as drafting-sheet annotations. */
export default function Section({ title, note, children, ticked = false, className = "" }) {
  return (
    <section className={`sheet ${ticked ? "ticked" : ""} p-5 sm:p-7 ${className}`}>
      {title && (
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
          <h2 className="annot text-paper">{title}</h2>
          {note && <span className="annot">{note}</span>}
        </header>
      )}
      {children}
    </section>
  );
}
