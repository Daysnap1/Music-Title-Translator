const select = document.getElementById("target");
for (const l of LANGUAGES) select.add(new Option(l.name, l.code));

chrome.storage.sync.get({ target: DEFAULT_TARGET }, ({ target }) => {
  select.value = target;
});

// Open music tabs pick this up instantly via storage.onChanged in content.js.
select.addEventListener("change", () => {
  chrome.storage.sync.set({ target: select.value });
});
