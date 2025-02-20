const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");

const staticOptions = {
  format: "A4",
  headerTemplate: "<p></p>",
  footerTemplate: "<p></p>",
  displayHeaderFooter: false,
  margin: {
    top: "40px",
    bottom: "100px",
  },
  printBackground: true,
  path: `pdf/${+new Date()}-invoice.pdf`,
};

function selectHTMLFilePath(type) {
  switch (type) {
    case "invoice":
      return "/templates/invoice.html";
    default:
      return "";
  }
}

function removeFile(path = "") {
  fs.stat(path, function (err, stats) {
    // console.log(stats);
    //here we got all information of file in stats variable
    if (err) {
      return console.error(err);
    }

    fs.unlink(path, function (err) {
      if (err) return console.log(err);
      console.log("file deleted successfully");
    });
  });
}

module.exports.html_to_pdf = async ({
  templateType = "",
  dataBinding,
  options,
}) => {
  if (!templateType) return "template type not define";

  let htmlFilePath = selectHTMLFilePath(templateType);
  const templateHtml = fs.readFileSync(
    path.join(process.cwd(), htmlFilePath),
    "utf8"
  );

  const template = handlebars.compile(templateHtml);
  const finalHtml = encodeURIComponent(template(dataBinding));

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
  });

  const page = await browser.newPage();
  await page.goto(`data:text/html;charset=UTF-8,${finalHtml}`, {
    waitUntil: "networkidle0",
  });

  const pdf = await page.pdf(options || staticOptions);
  await browser.close();
  removeFile(staticOptions.path);
  return {
    file: pdf,
    originalname: staticOptions.path.slice(4),
    mimetype: "application/pdf",
  };
};
