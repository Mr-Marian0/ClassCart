import { supabase } from "./supabaseClient.js";

/**
 * Shared Philippine Region -> Province -> City/Municipality -> Barangay
 * dropdown controller used by both saved addresses and checkout.
 */
export function initAddressLocations({
  regionId,
  provinceId,
  cityId,
  barangayId,
}) {
  const region = document.getElementById(regionId);
  const province = document.getElementById(provinceId);
  const city = document.getElementById(cityId);
  const barangay = document.getElementById(barangayId);

  if (!region || !province || !city || !barangay) {
    throw new Error("Address location fields are missing from the page.");
  }

  const placeholder = {
    region: "Select Region",
    province: "Select Province",
    city: "Select City / Municipality",
    barangay: "Select Barangay",
  };

  function normalizePsgc(code) {
    return String(code || "")
      .replace(/\D/g, "")
      .padStart(10, "0");
  }

  function setOptions(select, label, rows = [], disabled = false) {
    select.innerHTML = "";

    const option = document.createElement("option");
    option.value = "";
    option.textContent = label;
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);

    rows.forEach((row) => {
      const item = document.createElement("option");

      item.value = String(row.id);
      item.textContent = row.name;
      item.dataset.name = row.name;

      // Save PSGC code on the option so we can use it
      // if the foreign-key relationship doesn't return results.
      if (row.psgc_code) {
        item.dataset.psgcCode = row.psgc_code;
      }

      select.appendChild(item);
    });

    select.disabled = disabled;
  }

  function clearProvinceCityBarangay() {
    setOptions(province, placeholder.province, [], true);
    setOptions(city, placeholder.city, [], true);
    setOptions(barangay, placeholder.barangay, [], true);
  }

  async function loadRegions() {
    const { data, error } = await supabase
      .from("ph_regions")
      .select("id, psgc_code, name")
      .order("name");

    if (error) {
      console.error("Failed to load regions:", error);
      setOptions(region, "Unable to load regions", [], true);
      return;
    }

    setOptions(region, placeholder.region, data || [], false);
  }

  async function loadProvinces(regionIdValue) {
    setOptions(province, "Loading provinces…", [], true);
    setOptions(city, placeholder.city, [], true);
    setOptions(barangay, placeholder.barangay, [], true);

    const { data, error } = await supabase
      .from("ph_provinces")
      .select("id, psgc_code, name")
      .eq("region_id", regionIdValue)
      .order("name");

    if (error) {
      console.error("Failed to load provinces:", error);
      setOptions(province, "Unable to load provinces", [], true);
      return;
    }

    if (!data?.length) {
      // Province-less regions (e.g. NCR). Cities belong directly to the region.
      setOptions(province, "No province", [], true);
      await loadCities(null, regionIdValue);
      return;
    }

    setOptions(province, placeholder.province, data, false);
  }

  async function loadCities(
    provinceIdValue,
    regionIdValue = region.value,
    provincePsgcCode = "",
  ) {
    setOptions(city, "Loading cities / municipalities…", [], true);

    setOptions(barangay, placeholder.barangay, [], true);

    let data = [];
    let error = null;

    if (provincePsgcCode) {
      const provincePsgc = normalizePsgc(provincePsgcCode);

      // First 5 digits identify the province.
      const provincePrefix = provincePsgc.slice(0, 5);

      const result = await supabase
        .from("ph_cities_municipalities")
        .select("id, psgc_code, name, type")
        .like("psgc_code", `${provincePrefix}%`)
        .order("name");

      data = result.data || [];
      error = result.error;
    } else {
      // Province-less regions such as NCR.
      const result = await supabase
        .from("ph_cities_municipalities")
        .select("id, psgc_code, name, type")
        .eq("region_id", regionIdValue)
        .order("name");

      data = result.data || [];
      error = result.error;
    }

    if (error) {
      console.error("Failed to load cities / municipalities:", error);

      setOptions(city, "Unable to load cities / municipalities", [], true);

      return;
    }

    console.log("Cities / Municipalities loaded:", data.length, data);

    setOptions(city, placeholder.city, data, false);
  }

  async function loadBarangays(cityIdValue, cityPsgcCode = "") {
    setOptions(barangay, "Loading barangays…", [], true);

    if (!cityPsgcCode) {
      setOptions(barangay, placeholder.barangay, [], true);

      return;
    }

    const cityPsgc = normalizePsgc(cityPsgcCode);

    // First 7 digits identify the
    // city / municipality.
    const cityPrefix = cityPsgc.slice(0, 7);

    const { data, error } = await supabase
      .from("ph_barangays")
      .select("id, psgc_code, name")
      .like("psgc_code", `${cityPrefix}%`)
      .order("name");

    if (error) {
      console.error("Failed to load barangays:", error);

      setOptions(barangay, "Unable to load barangays", [], true);

      return;
    }

    console.log("Barangays loaded:", data?.length || 0, data);

    setOptions(barangay, placeholder.barangay, data || [], false);
  }

  region.addEventListener("change", async () => {
    if (!region.value) {
      clearProvinceCityBarangay();
      return;
    }
    await loadProvinces(region.value);
  });

  province.addEventListener("change", async () => {
    if (!province.value) {
      setOptions(city, placeholder.city, [], true);
      setOptions(barangay, placeholder.barangay, [], true);
      return;
    }

    const selectedProvince = province.options[province.selectedIndex];

    const provincePsgcCode = selectedProvince?.dataset.psgcCode || "";

    await loadCities(province.value, region.value, provincePsgcCode);
  });

  city.addEventListener("change", async () => {
    if (!city.value) {
      setOptions(barangay, placeholder.barangay, [], true);
      return;
    }

    const selectedCity = city.options[city.selectedIndex];

    const cityPsgcCode = selectedCity?.dataset.psgcCode || "";

    await loadBarangays(city.value, cityPsgcCode);
  });

  // Initial state + initial Region population.
  clearProvinceCityBarangay();
  loadRegions();

  async function reset() {
    region.value = "";
    setOptions(
      region,
      placeholder.region,
      Array.from(region.options)
        .filter((o) => o.value)
        .map((o) => ({ id: o.value, name: o.textContent })),
      false,
    );
    clearProvinceCityBarangay();
  }

  async function setValues(values) {
    // Ensure regions have been loaded.
    if (!region.options.length || region.options.length <= 1) {
      await loadRegions();
    }

    const regionOption = Array.from(region.options).find(
      (o) =>
        o.textContent.trim().toLowerCase() ===
        String(values.region || "")
          .trim()
          .toLowerCase(),
    );
    if (!regionOption) {
      await reset();
      return;
    }

    region.value = regionOption.value;
    await loadProvinces(region.value);

    let provinceIdValue = "";
    if (values.province) {
      const provinceOption = Array.from(province.options).find(
        (o) =>
          o.textContent.trim().toLowerCase() ===
          String(values.province).trim().toLowerCase(),
      );
      if (provinceOption) {
        province.value = provinceOption.value;
        provinceIdValue = provinceOption.value;
        const provincePsgcCode = provinceOption.dataset.psgcCode || "";
        await loadCities(provinceIdValue, region.value, provincePsgcCode);
      } else {
        // Province-less location: load cities directly from the region.
        await loadCities(null, region.value);
      }
    } else {
      await loadCities(null, region.value);
    }

    const cityOption = Array.from(city.options).find(
      (o) =>
        o.textContent.trim().toLowerCase() ===
        String(values.city || "")
          .trim()
          .toLowerCase(),
    );
    if (!cityOption) return;

    city.value = cityOption.value;
    const cityPsgcCode = cityOption.dataset.psgcCode || "";
    await loadBarangays(city.value, cityPsgcCode);

    const barangayOption = Array.from(barangay.options).find(
      (o) =>
        o.textContent.trim().toLowerCase() ===
        String(values.barangay || "")
          .trim()
          .toLowerCase(),
    );
    if (barangayOption) barangay.value = barangayOption.value;
  }

  function getValues() {
    return {
      region:
        region.options[region.selectedIndex]?.dataset.name ||
        region.options[region.selectedIndex]?.textContent ||
        "",
      province: province.value
        ? province.options[province.selectedIndex]?.dataset.name ||
          province.options[province.selectedIndex]?.textContent ||
          ""
        : "",
      city: city.value
        ? city.options[city.selectedIndex]?.dataset.name ||
          city.options[city.selectedIndex]?.textContent ||
          ""
        : "",
      barangay: barangay.value
        ? barangay.options[barangay.selectedIndex]?.dataset.name ||
          barangay.options[barangay.selectedIndex]?.textContent ||
          ""
        : "",
    };
  }

  return { reset, setValues, getValues };
}