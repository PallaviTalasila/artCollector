const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=5b0e4c16-e7bc-4c54-a95a-13dcd7adc5fa"; // USE YOUR KEY HERE

async function fetchObjects() {
  const url = `${BASE_URL}/object?${KEY}`;

  onFetchStart();

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

async function fetchAllCenturies() {
  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;
  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }
  onFetchStart();

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    const localStorage = records.centuries;
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

fetchAllCenturies();

async function fetchAllClassifications() {
  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;
  if (localStorage.getItem("classifications")) {
    return JSON.parse(localStorage.getItem("classifications"));
  }
  onFetchStart();

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    const localStorage = records.classifications;
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

fetchAllClassifications();

async function prefetchCategoryLists() {
  onFetchStart();
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);
    // This provides a clue to the user, that there are items in the dropdown
    $(".classification-count").text(`(${classifications.length})`);

    classifications.forEach((classification) => {
      // append a correctly formatted option tag into
      // the element with id select-classification
      $("#select-classification").append(
        $(
          `<option value="${classification.name}">${classification.name}</option>`
        )
      );
    });

    // This provides a clue to the user, that there are items in the dropdown
    $(".century-count").text(`(${centuries.length}))`);

    centuries.forEach((century) => {
      // append a correctly formatted option tag into
      // the element with id select-century
      $("#select-century").append(
        $(`<option value="${century.name}">${century.name}</option>`)
      );
    });
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

prefetchCategoryLists();

function buildSearchString() {
  const classificationKey = $("#select-classification").val();
  const centuryKey = $("#select-century").val();
  const wordKey = $("#keywords").val();
  return `${BASE_URL}/object?${KEY}&classification=${classificationKey}&century=${centuryKey}&keyword=${wordKey}`;
}

$("#search").on("submit", async function (event) {
  // prevent the form from actually submitting
  event.preventDefault();
  onFetchStart();

  try {
    // get the url from `buildSearchString`
    const url = encodeURI(buildSearchString());
    // fetch it with await, store the result

    const result = await fetch(url);
    const { records, info } = await result.json();

    updatePreview(records, info);
  } catch (error) {
    // log out the error
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

/*********************************Day 2 Goals****************************** */
function renderPreview(record) {
  return $(`<div class="object-preview">
    <a href="#">
    ${
      record.primaryimageurl && record.title
        ? `<img src="${record.primaryimageurl}" /><h3>${record.title}<h3>`
        : record.title
        ? `<h3>${record.title}<h3>`
        : record.description
        ? `<h3>${record.description}<h3>`
        : `<img src="${record.primaryimageurl}" />`
    }
      
    </a>`).data("record", record);
}

function updatePreview(records, info) {
  const root = $("#preview");

  if (info.next) {
    $(".next").data("url", info.next).attr("disabled", false);
  } else $(".next").data("url", null).attr("disabled", true);

  if (info.prev) {
    $(".previous").data("url", info.prev).attr("disabled", false);
  } else $(".previous").data("url", null).attr("disabled", true);

  $("#preview .results").empty();
  records.forEach(function (record) {
    $("#preview .results").append(renderPreview(record));
  });
}

$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();

  try {
    const url = $(this).data("url");
    const response = await fetch(url);
    const { records, info } = await response.json();

    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

/*********************************Day 3 Goals****************************** */

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault();

  const currRecord = $(this).closest(".object-preview").data("record");
  $("#feature").html(renderFeature(currRecord));
});

function renderFeature(record) {
  const {
    title,
    dated,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
    images,
    primaryimageurl,
  } = record;
  // build and return template
  return $(`<div class="object-feature">
  <header>
    <h3>${title}<h3>
    <h4>${dated}</h4>
  </header>
  <section class="facts">
    ${factHTML("Description", description)}
    ${factHTML("Culture", culture, "culture")}
    ${factHTML("Style", style)}
    ${factHTML("Technique", technique, "technique")}
    ${factHTML("Medium", medium ? medium.toLowerCase() : null, "medium")}
    ${factHTML("Dimensions", dimensions)}
    ${
      people
        ? people
            .map((person) => factHTML("Person", person.displayname, "person"))
            .join("")
        : ""
    }
    ${factHTML("Department", department)}
    ${factHTML("Division", division)}
    ${factHTML(
      "Contact",
      `<a target="_blank" href="mailto:${contact}">${contact}</a>`
    )}
    ${factHTML("Credit", creditline)}
  </section>
  <section class="photos">
    ${photosHTML(images, primaryimageurl)}
  </section>
</div>`);
}

function factHTML(title, content, searchKey = null) {
  if (!content) {
    return "";
  }

  return `
    <span class="title">${title}</span>
    <span class="content">${
      searchKey && content
        ? `<a href="${BASE_URL}/object?${KEY}&${searchKey}=${encodeURI(
            content.split("-").join("|")
          )}">${content}</a>`
        : content
    }
    </span>
  `;
}

function photosHTML(images, primaryimageurl) {
  if (images.length > 0) {
    return images
      .map((image) => `<img src="${image.baseimageurl}" />`)
      .join("");
  } else if (primaryimageurl) {
    return `<img src="${primaryimageurl}" />`;
  } else {
    return "";
  }
}

$("#feature").on("click", "a", async function (event) {
  const url = $(this).attr("href");

  if (url.startsWith("mailto:")) {
    return;
  }
  event.preventDefault();

  onFetchStart();

  try {
    const response = await fetch(url);
    const { records, info } = await response.json();
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});
