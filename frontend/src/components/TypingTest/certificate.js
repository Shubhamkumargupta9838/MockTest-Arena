export function buildCertHTML(result) {
  const date = result?.date instanceof Date ? result.date : new Date(result?.date);
  const formattedDate = date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!doctype html>
<html>
  <head>
    <title>Typing Certificate</title>
    <style>
      body {
        font-family: Georgia, serif;
        text-align: center;
        padding: 60px;
        background: #fff;
      }

      h1 {
        font-size: 36px;
        color: #1a8fc1;
        margin-bottom: 8px;
      }

      .wpm {
        font-size: 72px;
        font-weight: bold;
        color: #1a8fc1;
      }

      .sub {
        font-size: 18px;
        color: #64748b;
        margin: 8px 0;
      }

      .box {
        border: 4px double #1a8fc1;
        padding: 40px;
        display: inline-block;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Typing Certificate</h1>
      <div class="sub">This certifies that you typed at</div>
      <div class="wpm">${result.wpm} WPM</div>
      <div class="sub">with ${result.acc}% accuracy</div>
      <div class="sub" style="margin-top:20px;font-size:14px">${formattedDate}</div>
    </div>
  </body>
</html>`;
}

export function printCertificate(result) {
  if (!result) {
    alert("Complete a test first.");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow popups to print the certificate.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildCertHTML(result));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
