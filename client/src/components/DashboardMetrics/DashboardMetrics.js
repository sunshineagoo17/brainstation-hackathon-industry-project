import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import { unparse } from "papaparse";
import axios from "axios";
import Chart from "chart.js/auto";
import boxFullIcon from "../../assets/icons/box-full-icon.svg";
import chartIcon from "../../assets/icons/data-analysis-icon.svg";
import checkmarkIcon from "../../assets/icons/compliance-rate-icon.svg";
import shoppingCartIcon from "../../assets/icons/shopping-cart.svg";
import "./DashboardMetrics.scss";

// Base URL
const url = process.env.REACT_APP_BASE_URL;

const DashboardMetrics = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(""); 

  const truncateName = (name, maxLength = 20) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const response = await axios.get(`${url}/dashboard/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.data) {
          navigate("/auth");
        } else {
          setUserName(response.data.first_name); // Store user's first name
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${url}/api/retailers`);
        console.log("Fetched data:", response.data); // Log fetched data for debugging
        setData(response.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    fetchDashboardData();
  }, [userId, navigate]);

  const getStatus = (deviation) => {
    if (Math.abs(deviation) <= 5) {
      return "Compliant";
    } else if (Math.abs(deviation) > 5 && Math.abs(deviation) <= 15) {
      return "Needs Attention";
    } else if (Math.abs(deviation) > 15) {
      return "Non-Compliant";
    }
    return "Undetermined";
  };

  const calculateMetrics = (products) => {
    if (!products || products.length === 0) {
      return {
        complianceRate: 0,
        averageDeviation: 0,
        totalDeviatedProducts: 0,
      };
    }

    const totalProducts = products.length;
    const compliantProducts = products.filter(
      (product) => getStatus(parseFloat(product.Deviation)) === "Compliant"
    ).length;
    const complianceRate = (compliantProducts / totalProducts) * 100;
    const averageDeviation =
      products.reduce((sum, product) => sum + Math.abs(parseFloat(product.Deviation) || 0), 0) / totalProducts;
    const totalDeviatedProducts = totalProducts - compliantProducts;

    return {
      complianceRate: complianceRate.toFixed(2),
      averageDeviation: averageDeviation.toFixed(2),
      totalDeviatedProducts: totalDeviatedProducts,
    };
  };

  const handleExport = () => {
    if (!data) {
      console.warn("No data to export.");
      return;
    }

    const bestbuyTop5 = data.bestbuy.allProducts
      .filter(product => getStatus(parseFloat(product.Deviation)) === "Non-Compliant")
      .sort((a, b) => Math.abs(parseFloat(b.Deviation)) - Math.abs(parseFloat(a.Deviation)))
      .slice(0, 5);

    const neweggTop5 = data.newegg.allProducts
      .filter(product => getStatus(parseFloat(product.Deviation)) === "Non-Compliant")
      .sort((a, b) => Math.abs(parseFloat(b.Deviation)) - Math.abs(parseFloat(a.Deviation)))
      .slice(0, 5);

    const fields = [
      "Retailer",
      "Dell Product Name",
      "MSRP",
      "Authorized Seller Price",
      "Authorized Seller Deviation",
      "Total Deviated Products",
      "Average Deviation",
      "Compliance Rate"
    ];

    const csvData = [
      ...bestbuyTop5.map(product => ({
        Retailer: "BestBuy",
        "Dell Product Name": product.Dell_product,
        MSRP: parseFloat(product.Dell_price).toFixed(2),
        "Authorized Seller Price": parseFloat(product.Bestbuy_price).toFixed(2),
        "Authorized Seller Deviation": parseFloat(product.Deviation).toFixed(2) + "%",
        "Total Deviated Products": calculateMetrics(data.bestbuy.allProducts).totalDeviatedProducts,
        "Average Deviation": calculateMetrics(data.bestbuy.allProducts).averageDeviation,
        "Compliance Rate": calculateMetrics(data.bestbuy.allProducts).complianceRate
      })),
      ...neweggTop5.map(product => ({
        Retailer: "Newegg",
        "Dell Product Name": product.Dell_product,
        MSRP: parseFloat(product.Dell_price).toFixed(2),
        "Authorized Seller Price": parseFloat(product.Newegg_price).toFixed(2),
        "Authorized Seller Deviation": parseFloat(product.Deviation).toFixed(2) + "%",
        "Total Deviated Products": calculateMetrics(data.newegg.allProducts).totalDeviatedProducts,
        "Average Deviation": calculateMetrics(data.newegg.allProducts).averageDeviation,
        "Compliance Rate": calculateMetrics(data.newegg.allProducts).complianceRate
      }))
    ];

    const csv = unparse(csvData, { fields });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "dell_product_pricing_compliance_dashboard_data_generated_by_spectra.csv");
  };

  useEffect(() => {
    if (data) {
      // Filter and sort the top 5 offending products
      const bestbuyTop5 = data.bestbuy.allProducts
        .filter(product => getStatus(parseFloat(product.Deviation)) === "Non-Compliant")
        .sort((a, b) => Math.abs(parseFloat(b.Deviation)) - Math.abs(parseFloat(a.Deviation)))
        .slice(0, 5)
        .map(product => ({
          name: truncateName(product.Dell_product),
          deviation: Math.abs(parseFloat(product.Deviation)) || 0,
        }));

      const neweggTop5 = data.newegg.allProducts
        .filter(product => getStatus(parseFloat(product.Deviation)) === "Non-Compliant")
        .sort((a, b) => Math.abs(parseFloat(b.Deviation)) - Math.abs(parseFloat(a.Deviation)))
        .slice(0, 5)
        .map(product => ({
          name: truncateName(product.Dell_product),
          deviation: Math.abs(parseFloat(product.Deviation)) || 0,
        }));

      // Destroy existing charts before rendering new ones
      const destroyCharts = () => {
        const bestbuyChartCanvas = document.getElementById("bestbuyChart");
        const neweggChartCanvas = document.getElementById("neweggChart");

        if (bestbuyChartCanvas) {
          Chart.getChart(bestbuyChartCanvas)?.destroy();
        }

        if (neweggChartCanvas) {
          Chart.getChart(neweggChartCanvas)?.destroy();
        }
      };

      destroyCharts();

      // Create new charts
      const createCharts = () => {
        // BestBuy Top 5 Offending Products Chart
        const bestbuyCtx = document.getElementById("bestbuyChart")?.getContext("2d");
        if (bestbuyCtx) {
          new Chart(bestbuyCtx, {
            type: "bar",
            data: {
              labels: bestbuyTop5.map((product) => product.name),
              datasets: [
                {
                  label: "Price Deviation (%)",
                  data: bestbuyTop5.map((product) => product.deviation),
                  backgroundColor: "rgba(252, 236, 93, 0.65)",
                  borderColor: "#FCEC5D",
                  borderWidth: 1,
                  borderRadius: 5,
                },
              ],
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return value + "%";
                    }
                  }
                },
              },
            },
          });
        }

        // Newegg Top 5 Offending Products Chart
        const neweggCtx = document.getElementById("neweggChart")?.getContext("2d");
        if (neweggCtx) {
          new Chart(neweggCtx, {
            type: "bar",
            data: {
              labels: neweggTop5.map((product) => product.name),
              datasets: [
                {
                  label: "Price Deviation (%)",
                  data: neweggTop5.map((product) => product.deviation),
                  backgroundColor: "rgba(236, 157, 74, 0.65)",
                  borderColor: "#EC9D4A",
                  borderWidth: 1,
                  borderRadius: 5,
                },
              ],
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return value + "%";
                    }
                  }
                },
              },
            },
          });
        }
      };

      createCharts();
    }
  }, [data]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  const bestbuyMetrics = calculateMetrics(data.bestbuy.allProducts);
  const neweggMetrics = calculateMetrics(data.newegg.allProducts);

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Find the most deviated product for each retailer
  const getMostDeviatedProduct = (products) => {
    return products.reduce((max, product) => {
      const deviation = Math.abs(parseFloat(product.Deviation) || 0);
      return deviation > max.deviation
        ? { ...product, deviation }
        : max;
    }, { deviation: 0 });
  };

  const mostDeviatedBestbuy = getMostDeviatedProduct(data.bestbuy.allProducts);
  const mostDeviatedNewegg = getMostDeviatedProduct(data.newegg.allProducts);

  return (
    <div className="dashboard__wrapper">
      <div className="dashboard__details">
        <div className="dashboard-widget">
          <div className="dashboard-widget__container">
            <div className="dashboard-widget__details">
              <h2 className="dashboard-widget__details--heading">Total Offenders</h2>
              <span className="dashboard-widget__details--count">2</span>
            </div>
            <div className="dashboard-widget__icon-container">
              <img
                className="dashboard-widget__cart-icon"
                src={shoppingCartIcon}
                alt="shopping cart icon for the total offenders widget"
              />
            </div>
          </div>

          <div className="dashboard-widget__heading">
            <div className="dashboard-heading__content">
              <h1 className="dashboard-heading__content--heading">Welcome back, {userName}!</h1> {/* Use the fetched user's name */}
              <span className="dashboard-heading__content--date">{currentDate}</span>
            </div>
            <h2 className="dashboard-widget__heading--directions">
              Here are the <strong>top deviated products</strong> by <strong>retailer</strong>. 
              Please review the details below.
            </h2>
          </div>
        </div>
        
        <div className="chart-container">
          <div className="dashboard__bestbuy-container">
            <div className="chart-container__bestbuy"> 
              <div className="chart-container__retailer-label">
                BestBuy
              </div>   
              <div className="chart-wrapper">
                <canvas id="bestbuyChart" width="400" height="200"></canvas>
                <p className="chart-label">Product Names of Top 5 Deviated Products</p>
              </div>
            </div>
            <div className="dashboard__tiles">
              <div className="dashboard__deviated-products">
                <div className="dashboard__deviated-products--container">
                  <h2 className="dashboard__deviated-products--heading">Total Deviated Products</h2> 
                  <span className="dashboard__deviated-products--count">{bestbuyMetrics.totalDeviatedProducts}</span>                        
                </div>
                <div className="dashboard__deviated-products--img">
                  <img className="dashboard__deviated-products--icon" src={boxFullIcon} alt="product box icon" />
                </div>
              </div>
              <div className="dashboard__average-deviation">
                <div className="dashboard__average-deviation--container">
                  <h2 className="dashboard__average-deviation--heading">Average Deviation</h2> 
                  <span className="dashboard__average-deviation--count">{bestbuyMetrics.averageDeviation}%</span>                        
                </div>
                <div className="dashboard__average-deviation--img">
                  <img className="dashboard__average-deviation--icon" src={chartIcon} alt="chart icon" />
                </div>
              </div>
              <div className="dashboard__compliance-rate">
                <div className="dashboard__compliance-rate--container">
                  <h2 className="dashboard__compliance-rate--heading">Compliance Rate</h2> 
                  <span className="dashboard__compliance-rate--count">{bestbuyMetrics.complianceRate}%</span>                        
                </div>
                <div className="dashboard__compliance-rate--img">
                  <img className="dashboard__compliance-rate--icon" src={checkmarkIcon} alt="checkmark icon" />
                </div>
              </div>
            </div>
          </div>
          <div className="dashboard__newegg-container">
            <div className="chart-container__newegg">
              <div className="chart-container__retailer-label">
                Newegg
              </div>
              <div className="chart-wrapper">
                <canvas id="neweggChart" width="400" height="200"></canvas>
                <p className="chart-label">Product Names of Top 5 Deviated Products</p>
              </div>
            </div>
            <div className="dashboard__tiles">
              <div className="dashboard__deviated-products">
                <div className="dashboard__deviated-products--container">
                  <h2 className="dashboard__deviated-products--heading">Total Deviated Products</h2> 
                  <span className="dashboard__deviated-products--count">{neweggMetrics.totalDeviatedProducts}</span>                        
                </div>
                <div className="dashboard__deviated-products--img">
                  <img className="dashboard__deviated-products--icon" src={boxFullIcon} alt="product box icon" />
                </div>
              </div>
              <div className="dashboard__average-deviation">
                <div className="dashboard__average-deviation--container">
                  <h2 className="dashboard__average-deviation--heading">Average Deviation</h2> 
                  <span className="dashboard__average-deviation--count">{neweggMetrics.averageDeviation}%</span>                        
                </div>
                <div className="dashboard__average-deviation--img">
                  <img className="dashboard__average-deviation--icon" src={chartIcon} alt="chart icon" />
                </div>
              </div>
              <div className="dashboard__compliance-rate">
                <div className="dashboard__compliance-rate--container">
                  <h2 className="dashboard__compliance-rate--heading">Compliance Rate</h2> 
                  <span className="dashboard__compliance-rate--count">{neweggMetrics.complianceRate}%</span>                        
                </div>
                <div className="dashboard__compliance-rate--img">
                  <img className="dashboard__compliance-rate--icon" src={checkmarkIcon} alt="checkmark icon" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard__table-container">
        <div className="dashboard-list__table">
          <table className="dashboard-table">
            <thead className="dashboard-table__head">
              <tr className="dashboard-table__column">
                <th className="dashboard-table__column--item dashboard-column__retailer">Retailer</th>
                <th className="dashboard-table__column--item dashboard-column__dell-name">Dell Product Name</th>
                <th className="dashboard-table__column--item dashboard-column__msrp">MSRP</th>
                <th className="dashboard-table__column--item dashboard-column__price">Authorized Seller Price</th>
                <th className="dashboard-table__column--item dashboard-column__deviation">Authorized Seller Deviation</th>
              </tr>
            </thead>
            <tbody className="dashboard-table__body">
              <tr className="dashboard-table__row">
                <td className="dashboard-table__row--item row-retailer">BestBuy</td>
                <td className="dashboard-table__row--item row-dell-name">{mostDeviatedBestbuy.Dell_product}</td>
                <td className="dashboard-table__row--item row-retailer-msrp">${parseFloat(mostDeviatedBestbuy.Dell_price).toFixed(2)}</td>
                <td className="dashboard-table__row--item row-retailer-price">${parseFloat(mostDeviatedBestbuy.Bestbuy_price).toFixed(2)}</td>
                <td className="dashboard-table__row--item row-retailer-deviation">{mostDeviatedBestbuy.deviation.toFixed(2)}%</td>
              </tr>
              <tr className="dashboard-table__row">
                <td className="dashboard-table__row--item row-retailer">Newegg</td>
                <td className="dashboard-table__row--item row-dell-name">{mostDeviatedNewegg.Dell_product}</td>
                <td className="dashboard-table__row--item row-retailer-msrp">${parseFloat(mostDeviatedNewegg.Dell_price).toFixed(2)}</td>
                <td className="dashboard-table__row--item row-retailer-price">${parseFloat(mostDeviatedNewegg.Newegg_price).toFixed(2)}</td>
                <td className="dashboard-table__row--item row-retailer-deviation">{mostDeviatedNewegg.deviation.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="export-container">
        <button className="export-container__button" onClick={handleExport}>
          <span className="export-container__button--text">Export</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardMetrics;