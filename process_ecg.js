#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Import our preprocessor functions
const ECG_CONSTANTS = {
  WIDTH_SECONDS: 5,
  DISPLAY_PRECISION: 3,
  METADATA_PRECISION: 6,
};

function preprocessECGData(rawData, options = {}) {
  const {
    precision = ECG_CONSTANTS.DISPLAY_PRECISION,
    metadataPrecision = ECG_CONSTANTS.METADATA_PRECISION,
  } = options;

  try {
    // Validate input data
    if (!rawData || !rawData.fs || !rawData.sig_names || !rawData.signals) {
      throw new Error("Invalid ECG data format");
    }

    const samplingRate = rawData.fs;
    const leadNames = rawData.sig_names;
    const signals = rawData.signals;
    const totalSamples = signals.length;
    const totalDuration = totalSamples / samplingRate;

    console.log(`Processing ECG data:`);
    console.log(`- Sampling rate: ${samplingRate} Hz`);
    console.log(`- Total samples: ${totalSamples}`);
    console.log(`- Duration: ${totalDuration.toFixed(2)} seconds`);
    console.log(`- Leads: ${leadNames.join(', ')}`);

    // Pre-calculate time array once (shared across all leads)
    const timeArray = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      timeArray[i] = parseFloat((i / samplingRate).toFixed(metadataPrecision));
    }

    // Process each lead into optimized format
    const leads = leadNames.map((leadName, leadIndex) => {
      console.log(`Processing lead ${leadIndex + 1}/${leadNames.length}: ${leadName}`);
      
      // Extract values for this lead with reduced precision
      const values = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i++) {
        const rawValue = signals[i][leadIndex] || 0;
        values[i] = parseFloat(rawValue.toFixed(precision));
      }

      return {
        name: leadName,
        index: leadIndex,
        // Store as efficient arrays - no chunking by width
        times: Array.from(timeArray),
        values: Array.from(values),
        totalSamples: totalSamples,
        valueRange: {
          min: parseFloat(Math.min(...values).toFixed(precision)),
          max: parseFloat(Math.max(...values).toFixed(precision)),
        }
      };
    });

    // Build optimized data structure
    const optimizedData = {
      metadata: {
        version: "1.0",
        originalFile: "processed",
        samplingRate: samplingRate,
        totalDuration: parseFloat(totalDuration.toFixed(metadataPrecision)),
        totalSamples: totalSamples,
        leadCount: leadNames.length,
        precision: precision,
        processedAt: new Date().toISOString(),
      },
      leadNames: leadNames,
      leads: leads,
      // Global statistics for visualization setup
      globalValueRange: {
        min: parseFloat(Math.min(...leads.map(lead => lead.valueRange.min)).toFixed(precision)),
        max: parseFloat(Math.max(...leads.map(lead => lead.valueRange.max)).toFixed(precision)),
      },
    };

    return optimizedData;
  } catch (error) {
    console.error("ECG preprocessing failed:", error);
    throw error;
  }
}

function createMetadataOnly(optimizedData) {
  return {
    metadata: optimizedData.metadata,
    leadNames: optimizedData.leadNames,
    globalValueRange: optimizedData.globalValueRange,
    leads: optimizedData.leads.map(lead => ({
      name: lead.name,
      index: lead.index,
      totalSamples: lead.totalSamples,
      valueRange: lead.valueRange,
    })),
  };
}

async function processECGFile(inputPath, outputDir) {
  try {
    console.log(`\n🔄 Processing: ${inputPath}`);
    
    // Read the raw ECG data
    const rawData = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    const originalSize = JSON.stringify(rawData).length;
    
    // Preprocess the data
    const optimizedData = preprocessECGData(rawData);
    
    // Create metadata-only version
    const metadataOnly = createMetadataOnly(optimizedData);
    
    // Calculate sizes
    const optimizedSize = JSON.stringify(optimizedData).length;
    const metadataSize = JSON.stringify(metadataOnly).length;
    
    // Generate output paths
    const baseName = path.basename(inputPath, '.json');
    const optimizedPath = path.join(outputDir, `${baseName}-optimized.json`);
    const metadataPath = path.join(outputDir, `${baseName}-metadata.json`);
    
    // Write optimized files
    await fs.writeFile(optimizedPath, JSON.stringify(optimizedData, null, 2));
    await fs.writeFile(metadataPath, JSON.stringify(metadataOnly, null, 2));
    
    // Report results
    console.log(`\n✅ Processing complete!`);
    console.log(`📊 Size comparison:`);
    console.log(`   Original:  ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Optimized: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB (${((optimizedSize / originalSize) * 100).toFixed(1)}%)`);
    console.log(`   Metadata:  ${(metadataSize / 1024).toFixed(2)} KB`);
    console.log(`📁 Output files:`);
    console.log(`   ${optimizedPath}`);
    console.log(`   ${metadataPath}`);
    
    return { optimizedData, metadataOnly };
  } catch (error) {
    console.error(`❌ Failed to process ${inputPath}:`, error.message);
    throw error;
  }
}

async function main() {
  const inputPath = './priv/static/assets/js/00020.json';
  const outputDir = './priv/static/assets/js/';
  
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Process the ECG file
    await processECGFile(inputPath, outputDir);
    
    console.log(`\n🎉 ECG preprocessing completed successfully!`);
    console.log(`\nTo use in your application:`);
    console.log(`1. Update fetch URL to: "/assets/js/00020-optimized.json"`);
    console.log(`2. The ECG playback component will automatically detect the preprocessed format`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { preprocessECGData, createMetadataOnly, processECGFile };