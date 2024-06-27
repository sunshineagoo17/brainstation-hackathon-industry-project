import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import boxIcon from "../../assets/icons/box-icon.svg";
import axios from "axios";
import { saveAs } from "file-saver";
import { unparse } from "papaparse";
import "./ProductList.scss";

// Base Url
const url = process.env.REACT_APP_BASE_URL;

const ProductList = ({ userId }) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  // State to store product data and total offenders
  const [products, setProducts] = useState([]);
  const [totalOffenders, setTotalOffenders] = useState(0);

  // Function to generate a unique two-digit numerical ID starting from 01
  const generateShortUUID = useCallback(() => {
    let currentId = 1;
    return () => {
      const id = (currentId % 100).toString().padStart(2, "0");
      currentId++;
      return id;
    };
  }, []);

  // Function to get the status based on deviation
  const getStatus = (deviation) => {
    if (isNaN(deviation)) {
      return "Undetermined";
    }
    const absDeviation = Math.abs(deviation);
    if (absDeviation <= 5) {
      return "Compliant";
    } else if (absDeviation > 5 && absDeviation <= 15) {
      return "Attention";
    } else if (absDeviation > 15) {
      return "Non-Compliant";
    }
    return "Undetermined";
  };

  // Function to combine data from Dell, BestBuy, and Newegg
  const combineData = useCallback(
    (dell, bestbuy, newegg) => {
      let offendersCount = 0;
      const generateId = generateShortUUID();
      const combined = dell.map((dellItem) => {
        const bestbuyItem =
          bestbuy.find((item) => item.Dell_product === dellItem.Dell_product) ||
          {};
        const neweggItem =
          newegg.find((item) => item.Dell_product === dellItem.Dell_product) ||
          {};

        const bestbuyPrice = parseFloat(bestbuyItem.Bestbuy_price);
        const neweggPrice = parseFloat(neweggItem.Newegg_price);
        const msrp = parseFloat(dellItem.Dell_price);

        const bestbuyDeviation = bestbuyPrice ? ((bestbuyPrice - msrp) / msrp) * 100 : NaN;
        const neweggDeviation = neweggPrice ? ((neweggPrice - msrp) / msrp) * 100 : NaN;

        // Count as non-compliant if deviation is not within the compliant range
        if (!isNaN(bestbuyDeviation) && getStatus(bestbuyDeviation) !== "Compliant") {
          offendersCount++;
        }
        if (!isNaN(neweggDeviation) && getStatus(neweggDeviation) !== "Compliant") {
          offendersCount++;
        }

        return {
          id: generateId(),
          dellProductName: dellItem.Dell_product,
          msrp: dellItem.Dell_price,
          bestbuyPrice: bestbuyItem.Bestbuy_price
            ? `$${parseFloat(bestbuyItem.Bestbuy_price).toFixed(2)}`
            : "Not Available",
          bestbuyDeviation: bestbuyItem.Deviation
            ? bestbuyDeviation.toFixed(2) + "%"
            : "N/A",
          bestbuyCompliance: getStatus(bestbuyDeviation),
          neweggPrice: neweggItem.Newegg_price
            ? `$${parseFloat(neweggItem.Newegg_price).toFixed(2)}`
            : "Not Available",
          neweggDeviation: neweggItem.Deviation
            ? neweggDeviation.toFixed(2) + "%"
            : "N/A",
          neweggCompliance: getStatus(neweggDeviation),
        };
      });
      setTotalOffenders(offendersCount);
      console.log("Combined Data:", combined); // Add console log for debugging
      return combined.sort((a, b) => a.id - b.id);
    },
    [generateShortUUID]
  );

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Fetch product data from APIs and combine them
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const dellData = await axios.get(`${url}/api/data/dell`);
        const bestbuyData = await axios.get(
          `${url}/api/data/compare/dell-bestbuy`
        );
        const neweggData = await axios.get(
          `${url}/api/data/compare/dell-newegg`
        );

        const combinedData = combineData(
          dellData.data,
          bestbuyData.data,
          neweggData.data
        );
        setProducts(combinedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchProducts();
  }, [combineData]);

  // Function to handle exporting the data as CSV
  const handleExport = () => {
    if (products.length === 0) {
      console.warn("No products to export.");
      return;
    }

    console.log("Exporting Data:", products); // Add console log for exporting data

    const fields = [
      "id",
      "dellProductName",
      "msrp",
      "bestbuyPrice",
      "bestbuyDeviation",
      "bestbuyCompliance",
      "neweggPrice",
      "neweggDeviation",
      "neweggCompliance",
    ];

    const csvData = unparse({
      fields,
      data: products.map((product) => ({
        id: product.id,
        dellProductName: product.dellProductName,
        msrp: product.msrp,
        bestbuyPrice: product.bestbuyPrice,
        bestbuyDeviation: product.bestbuyDeviation,
        bestbuyCompliance: product.bestbuyCompliance,
        neweggPrice: product.neweggPrice,
        neweggDeviation: product.neweggDeviation,
        neweggCompliance: product.neweggCompliance,
      })),
    });

    console.log("CSV Data:", csvData); // Add console log for CSV data

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "dell_product_pricing_compliance_products_list_data_generated_by_spectra.csv");
  };

  // Function to truncate text with ellipsis
  const truncateText = (text, maxLength) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "...";
    }
    return text;
  };

  // Function to handle sorting
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setProducts((prevProducts) => {
      const sortedProducts = [...prevProducts];
      sortedProducts.sort((a, b) => {
        if (key === "dellProductName") {
          return direction === "ascending"
            ? a[key].localeCompare(b[key])
            : b[key].localeCompare(a[key]);
        } else if (key === "msrp" || key === "bestbuyPrice" || key === "neweggPrice") {
          const aValue = parseFloat(a[key].replace('$', '')) || a[key];
          const bValue = parseFloat(b[key].replace('$', '')) || b[key];
          if (!isNaN(aValue) && !isNaN(bValue)) {
            return direction === "ascending" ? aValue - bValue : bValue - aValue;
          } else {
            return direction === "ascending" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
          }
        } else if (key === "bestbuyDeviation" || key === "neweggDeviation") {
          const aValue = parseFloat(a[key].replace('%', '')) || a[key];
          const bValue = parseFloat(b[key].replace('%', '')) || b[key];
          if (!isNaN(aValue) && !isNaN(bValue)) {
            return direction === "ascending" ? aValue - bValue : bValue - aValue;
          } else {
            return direction === "ascending" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
          }
        } else {
          if (a[key] < b[key]) {
            return direction === "ascending" ? -1 : 1;
          }
          if (a[key] > b[key]) {
            return direction === "ascending" ? 1 : -1;
          }
          return 0;
        }
      });
      return sortedProducts;
    });
  };

  return (
    <div className="product-list__wrapper">
      <div className="product-list__details">
        <div className="offenders-widget">
          <div className="offenders-widget__details">
            <h2 className="offenders-widget__details--heading">
              Total Deviated Products
            </h2>
            <span className="offenders-widget__details--count">
              {totalOffenders}
            </span>
          </div>
          <img
            className="offenders-widget__icon"
            src={boxIcon}
            alt="cube icon for the total offending products widget"
          />
        </div>
        <div className="product-list__heading">
          <div className="heading__content">
            <h1 className="heading__content--heading">
              Product Pricing Compliance
            </h1>
            <span className="heading__content--date">{currentDate}</span>
          </div>
          <h2 className="product-list__heading--directions">
            Please review the <strong>compliance status</strong> and{" "}
            <strong>price deviations</strong> for each product below.
          </h2>
        </div>
      </div>
      <div className="product-list__table">
        <table className="product-table">
          <thead className="product-table__head">
            <tr className="product-table__column">
              <th
                className="product-table__column--item product-column__id"
                onClick={() => handleSort("id")}
              >
                ID
              </th>
              <th
                className="product-table__column--item product-column__name"
                onClick={() => handleSort("dellProductName")}
              >
                Dell Product Name
              </th>
              <th
                className="product-table__column--item product-column__msrp"
                onClick={() => handleSort("msrp")}
              >
                MSRP
              </th>
              <th
                className="product-table__column--item product-column__bbp"
                onClick={() => handleSort("bestbuyPrice")}
              >
                BestBuy Price
              </th>
              <th
                className="product-table__column--item product-column__bbd"
                onClick={() => handleSort("bestbuyDeviation")}
              >
                Deviation
              </th>
              <th
                className="product-table__column--item product-column__bbc"
                onClick={() => handleSort("bestbuyCompliance")}
              >
                Compliance
              </th>
              <th
                className="product-table__column--item product-column__nep"
                onClick={() => handleSort("neweggPrice")}
              >
                Newegg Price
              </th>
              <th
                className="product-table__column--item product-column__ned"
                onClick={() => handleSort("neweggDeviation")}
              >
                Deviation
              </th>
              <th
                className="product-table__column--item product-column__nec"
                onClick={() => handleSort("neweggCompliance")}
              >
                Compliance
              </th>
            </tr>
          </thead>
          <tbody className="product-table__body">
            {products.map((product) => (
              <tr className="product-table__row" key={product.id}>
                <td className="product-table__row--item row-id">
                  {product.id}
                </td>
                <td
                  className="product-table__row--item row-name"
                  title={product.dellProductName}
                >
                  {truncateText(product.dellProductName, 15)}
                </td>
                <td className="product-table__row--item row-msrp">
                  {product.msrp ? `$${product.msrp}` : product.msrp}
                </td>
                <td className="product-table__row--item row-bbp">
                  <span
                    className={`cell-content ${
                      product.bestbuyPrice === "Not Available"
                        ? "not-available"
                        : ""
                    }`}
                  >
                    {product.bestbuyPrice &&
                    product.bestbuyPrice !== "Not Available"
                      ? product.bestbuyPrice
                      : product.bestbuyPrice}
                  </span>
                </td>
                <td className="product-table__row--item row-bbd">
                  <span
                    className={`cell-content ${
                      product.bestbuyDeviation === "N/A" ? "not-available" : ""
                    }`}
                  >
                    {product.bestbuyDeviation &&
                    product.bestbuyDeviation !== "N/A"
                      ? `${product.bestbuyDeviation}`
                      : product.bestbuyDeviation}
                  </span>
                </td>
                <td className="product-table__row--item row-bbc">
                  <span
                    className={`cell-content ${
                      product.bestbuyCompliance === "Compliant"
                        ? "compliant"
                        : ""
                    } ${
                      product.bestbuyCompliance === "Non-Compliant"
                        ? "noncompliant"
                        : ""
                    } ${
                      product.bestbuyCompliance === "Attention"
                        ? "attention"
                        : ""
                    } ${
                      product.bestbuyCompliance === "Undetermined"
                        ? "not-available"
                        : ""
                    }`}
                  >
                    {product.bestbuyCompliance}
                  </span>
                </td>
                <td className="product-table__row--item row-nep">
                  <span
                    className={`cell-content ${
                      product.neweggPrice === "Not Available"
                        ? "not-available"
                        : ""
                    }`}
                  >
                    {product.neweggPrice &&
                    product.neweggPrice !== "Not Available"
                      ? product.neweggPrice
                      : product.neweggPrice}
                  </span>
                </td>
                <td className="product-table__row--item row-ned">
                  <span
                    className={`cell-content ${
                      product.neweggDeviation === "N/A" ? "not-available" : ""
                    }`}
                  >
                    {product.neweggDeviation &&
                    product.neweggDeviation !== "N/A"
                      ? `${product.neweggDeviation}`
                      : product.neweggDeviation}
                  </span>
                </td>
                <td className="product-table__row--item row-nec">
                  <span
                    className={`cell-content ${
                      product.neweggCompliance === "Compliant"
                        ? "compliant"
                        : ""
                    } ${
                      product.neweggCompliance === "Non-Compliant"
                        ? "noncompliant"
                        : ""
                    } ${
                      product.neweggCompliance === "Attention"
                        ? "attention"
                        : ""
                    } ${
                      product.neweggCompliance === "Undetermined"
                        ? "not-available"
                        : ""
                    }`}
                  >
                    {product.neweggCompliance}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="export-container">
        <button className="export-container__button" onClick={handleExport}>
          <span className="export-container__button--text">Export</span>
        </button>
      </div>
    </div>
  );
};

ProductList.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default ProductList;