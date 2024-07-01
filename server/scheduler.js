const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 

const scriptsDir = path.join(__dirname, 'scripts');

// Function to execute a Python script
function runPythonScript(scriptName, callback) {
    const scriptPath = path.join(scriptsDir, scriptName);
    console.log(`Starting execution of ${scriptName} at ${new Date().toISOString()}`);

    exec(`python3 ${scriptPath}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error executing ${scriptName} at ${new Date().toISOString()}: ${err.message}`);
            return callback(err);
        }
        console.log(`${scriptName} output at ${new Date().toISOString()}: ${stdout}`);
        if (stderr) console.error(`${scriptName} stderr at ${new Date().toISOString()}: ${stderr}`);
        callback(null);
    });
}

// Function to run all scripts in sequence
function runAllScriptsSequentially() {
    runPythonScript('dell_scraper.py', (err) => {
        if (err) return;
        runPythonScript('newegg_scraper.py', (err) => {
            if (err) return;
            runPythonScript('bestbuy_scraper.py', (err) => {
                if (err) return;
                runPythonScript('compare_dell_newegg_current_date.py', (err) => {
                    if (err) return;
                    runPythonScript('compare_dell_bestbuy_current_date.py', (err) => {
                        if (err) return;
                        runPythonScript('product_page.py', (err) => {
                            if (err) return;
                            console.log('All scripts executed successfully');
                            pushChangesToGitHub(); // Add this to push changes after all scripts run
                        });
                    });
                });
            });
        });
    });
}

// Function to commit and push changes to GitHub
function pushChangesToGitHub() {
    const GITHUB_PAT = process.env.GITHUB_PAT; 
    const REPO_URL = `https://${GITHUB_PAT}@github.com/sunshineagoo17/spectra-dell-industry-project.git`;

    exec('git add .', (err, stdout, stderr) => {
        if (err) {
            console.error(`Error adding files to Git: ${stderr}`);
            return;
        }
        exec('git commit -m "Update CSV files"', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error committing files to Git: ${stderr}`);
                return;
            }
            exec(`git push ${REPO_URL} main`, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error pushing to GitHub: ${stderr}`);
                    return;
                }
                console.log('Changes pushed to GitHub successfully!');
            });
        });
    });
}

// Schedule all scripts to run at midnight in Toronto (Eastern Time)
cron.schedule('0 0 * * *', () => {
    runAllScriptsSequentially();
}, {
    scheduled: true,
    timezone: "America/Toronto"
});

console.log('Scrapers and comparison scripts scheduled to run at midnight Toronto time.');