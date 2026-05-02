import { namedSlotsTemplate } from "@liqvid/utils";

export const tsxTemplate = namedSlotsTemplate`const {createRoot} = ReactDOM;

${"main"}

createRoot(document.querySelector("main")).render(<Component />)`;

export const htmlTemplate = namedSlotsTemplate`<html>
<body>
  <main></main>
  
  <script crossorigin defer src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
  <script crossorigin defer src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
  <script defer>window.addEventListener("DOMContentLoaded", () => {${"script"}});</script>
</body>
</html>`;
