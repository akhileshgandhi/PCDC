import docx
p = r"C:\Users\user\Downloads\Prestige Capability Development Centre- Specifications (1).docx"
d = docx.Document(p)

def iter_block_items(parent):
    from docx.oxml.ns import qn
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    body = parent.element.body
    for child in body.iterchildren():
        if child.tag == qn('w:p'):
            yield Paragraph(child, parent)
        elif child.tag == qn('w:tbl'):
            yield Table(child, parent)

out = []
for block in iter_block_items(d):
    if isinstance(block, docx.text.paragraph.Paragraph):
        style = block.style.name if block.style else ""
        txt = block.text.strip()
        if txt:
            prefix = f"[{style}] " if style and style.lower().startswith(("heading","title")) else ""
            out.append(prefix + txt)
    else:  # table
        out.append("--- TABLE ---")
        for row in block.rows:
            cells = [c.text.strip().replace("\n"," ") for c in row.cells]
            out.append(" | ".join(cells))
        out.append("--- END TABLE ---")

text = "\n".join(out)
with open(r"C:\Users\user\Downloads\Prestige\spec_extracted.txt", "w", encoding="utf-8") as f:
    f.write(text)
print(f"chars: {len(text)}  paragraphs/blocks: {len(out)}")
