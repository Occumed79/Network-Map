from pathlib import Path

app = Path('occu-med-map/src/App.tsx')
text = app.read_text()
old = '''          {(activeTool === 'radius')&&(
            <div className="local-pop-card" style={{top: dropCenter ? 184 : 96, borderColor:'rgba(252,165,165,0.35)', boxShadow:'0 10px 30px rgba(239,68,68,0.16)'}}>'''
new = '''          {(activeTool === 'radius')&&(
            <div className="local-pop-card radius-extractor-card" style={{top: dropCenter ? 184 : 96, borderColor:'rgba(252,165,165,0.35)', boxShadow:'0 10px 30px rgba(239,68,68,0.16)'}}>'''
if old not in text:
    raise SystemExit('Radius extractor card target not found')
app.write_text(text.replace(old, new, 1))

css = Path('occu-med-map/src/us-diagnostics-gate.css')
text = css.read_text()
old = '''html.occumed-us-diagnostics-off .tz-legend,
html.occumed-us-diagnostics-off .legend-row,
html.occumed-us-diagnostics-off .br,
html.occumed-us-diagnostics-off .local-pop-card {
  display: none !important;
}'''
new = '''html.occumed-us-diagnostics-off .tz-legend,
html.occumed-us-diagnostics-off .legend-row,
html.occumed-us-diagnostics-off .br,
html.occumed-us-diagnostics-off .local-pop-card:not(.radius-extractor-card) {
  display: none !important;
}'''
if old not in text:
    raise SystemExit('U.S. Diagnostics local-pop-card gate target not found')
css.write_text(text.replace(old, new, 1))

print('Separated Radius extractor visibility from the U.S. Diagnostics gate.')
