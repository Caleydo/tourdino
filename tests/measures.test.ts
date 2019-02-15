/// <reference types="jasmine" />
import {SpearmanCorrelation, StudentTTest, WilcoxonRankSumTest} from '../src/Measures';

const MDM2_TPM_FEMALE = [11.17,44.77,9.30,18.66,13.51,36.00,26.68,53.44,71.20,49.70,30.25,26.59,139.36,24.53,249.85,27.91,14.79,36.76,16.01,19.91,45.32,23.87,35.21,25.47,24.77,44.98,16.00,16.58,26.08,90.04,22.82,24.33,58.79,15.54,14.14,16.50,39.61,27.65,18.38,1453.39,33.40,58.16,31.86,67.78,40.37,16.15,58.99,40.79,29.42,36.23,14.34,183.45,10.89,13.16,116.87,76.58,53.72,59.72,14.09,1200.40,21.96,39.76,73.28,18.62,38.73,36.93,46.09,28.81,52.80,16.21,15.04,23.55,9.60,20.11,20.56,21.67,31.91,78.06,18.80,47.57,56.06,53.22,91.81,143.42,28.92,11.54,37.31,112.94,31.60,32.54,12.08,19.14,19.26,24.38,14.13,20.45,10.89,18.70,30.19,14.41,18.09,13.49,10.57,100.21,79.10,19.79,19.78,18.72,72.08,15.40,80.31,130.54,63.06,39.99,26.09,28.27,74.85,36.51,26.93,12.58,50.09,89.23,34.42,109.35,30.30,69.35,28.73,87.91,53.03,30.69,28.95,34.82,26.41,78.10,37.58,16.58,68.10,10.53,52.52,11.32,50.38,24.63,59.39,15.34,24.37,81.22,67.92,20.00,38.15,22.07,85.13,23.56,18.95,17.77,19.44,24.90,14.72,53.29,24.61,32.49,19.02,37.48,66.51,51.79,49.83,73.63,15.15,30.70,23.66,25.43,92.97,29.94,155.49,17.47,52.98,36.83,17.24,30.48,14.16,51.85,39.97,18.17,66.58,51.57,18.33,32.62,22.15,38.59,33.24,9.09,29.40,32.59,26.09,59.22,22.82,47.08,22.83,29.85,45.31,372.16,194.82,196.02,34.70,26.77,34.57,32.39,228.84,68.36,21.88,30.63,80.91,41.68,66.78,22.78,24.05,49.36,41.09,65.00,75.42,19.73,31.52,17.19,31.50,30.99,31.61,16.54,87.89,11.90,15.36,33.35,70.85,35.42,79.00,59.17,55.06,13.62,24.71,17.32,53.74,78.69,20.61,23.00,73.50,219.59,22.32,51.80,42.37,18.36,36.99,76.87,22.16,59.71,61.14,19.75,27.71,18.83,17.64,11.30,46.75,25.78,18.28,14.52,218.64,42.76,162.62,8.00,41.38,16.52,30.34,10.52,59.92,19.92,34.16,48.81,12.26,26.76,37.69,120.05,12.77,23.40,153.12,24.93,55.11,17.54,15.84,48.33,37.25,65.14,11.37,38.43,92.26,36.82,16.05,26.89,17.91,13.30,38.06,23.03,15.37,18.08,32.34,54.46,62.85,18.52,38.24,32.13,21.17,39.57,96.35,15.23,39.69,78.69,25.55,63.16,19.79,14.56,20.48,142.04,14.30,17.15,13.06,50.18,52.32,49.84,144.22,67.25,14.22,70.35,368.56,36.50,11.82,18.49,77.93,12.97,14.92,77.75,102.42,16.44,55.22,48.45,28.31,18.82,69.08,104.52,72.61,72.61,162.17,30.18,48.08,48.36,18.66,56.75,163.06,21.83,120.20,88.92,18.70,16.76,137.19,28.29];
const MDM2_TPM_MALE = [70.01,144.84,15.59,27.79,26.11,26.24,300.99,24.41,104.33,33.69,24.50,16.40,49.68,64.09,37.12,124.93,24.96,106.89,386.64,53.67,17.79,11.25,35.65,17.48,15.88,17.99,14.42,43.58,43.89,269.52,30.22,97.99,99.06,111.51,104.25,32.96,20.30,14.44,80.65,23.15,21.40,15.14,32.93,12.74,12.17,22.22,24.19,41.22,14.78,20.32,238.57,43.75,18.14,127.47,63.00,13.38,75.23,52.42,24.59,35.04,44.17,47.07,45.38,47.53,19.92,105.21,29.08,27.16,45.68,44.27,76.93,39.84,52.72,32.90,39.29,25.42,166.99,16.95,35.83,23.83,26.84,17.60,15.47,25.14,15.83,100.50,41.86,89.05,13.87,15.36,17.58,20.41,39.28,37.13,29.87,21.69,20.89,30.48,25.44,49.61,16.77,31.31,19.19,84.75,46.50,21.66,41.01,28.49,60.44,14.69,26.51,29.06,28.54,73.69,29.10,134.18,60.47,45.41,16.88,33.01,37.95,83.71,19.33,15.37,60.25,41.05,31.36,106.81,38.46,77.21,37.26,34.51,23.46,16.42,30.41,117.06,269.79,74.54,111.59,30.13,14.41,22.23,48.52,7.19,14.52,227.77,31.64,41.53,19.66,48.53,10.30,50.40,66.95,26.61,18.01,210.78,10.17,13.53,39.96,32.19,78.73,42.21,26.31,38.10,24.16,106.43,19.90,23.64,144.40,15.35,16.23,36.42,21.82,67.88,30.23,154.52,26.57,132.97,51.87,31.61,67.66,49.69,116.29,20.83,29.65,23.39,13.65,20.30,53.93,29.10,40.96,19.83,15.95,16.25,19.52,12.20,38.56,26.78,30.76,32.37,12.89,48.71,16.45,27.30,31.13,18.35,46.17,84.65,53.85,14.58,42.68,50.21,15.23,51.02,28.66,14.79,12.88,83.55,22.25,60.52,14.68,27.59,19.19,22.18,17.35,193.97,40.40,42.54,23.48,45.77,85.14,22.83,7.23,59.65,26.33,13.94,14.91,33.37,10.70,15.19,17.12,93.52,210.90,73.08,264.00,72.82,41.67,25.98,134.65,25.88,88.08,23.20,49.13,73.18,36.64,55.77,39.88,31.17,50.98,31.80,39.46,23.61,37.45,20.91,47.32,64.71,80.62,53.41,26.19,61.76,29.44,20.60,179.27,18.16,20.03,45.23,36.44,30.80,35.06,46.07,77.27,34.29,160.20,21.30,57.09,24.77,30.88,13.37,18.29,30.44,31.15,16.51,23.64,35.34,25.55,15.32,87.40,21.95,43.23,26.81,42.53,34.04,15.72,30.03,57.66,33.85,45.12,25.29,45.09,29.73,29.76,23.17,20.51,23.12,33.97,43.42,17.20,43.90,17.10,47.49,13.28,10.74,14.96,122.94,31.77,88.84,31.38,19.42,21.03,19.23,8.68,24.77,14.52,15.29,29.25,11.08,24.83,40.15,67.81,32.24,30.93,39.03,44.66,27.17,14.97,23.80,13.45,25.27,13.09,61.82,13.03,15.30,7.31,21.85,34.77,26.26,27.88,75.36,26.43,735.29,46.51,49.23,73.65,10.48,72.51,46.66,31.23,15.78,18.67,17.60,28.73,25.79,56.11,29.64,21.98,12.43,14.93,15.67,17.59,15.27,19.38,81.05,49.80,33.40,88.27,20.05,11.97,19.07,45.55,18.15,11.33,25.07,21.62,17.32,25.57,18.21,107.65,19.79,10.12,27.80,28.55,29.37,12.99,142.33,74.06,63.99,18.46,26.04,46.31,23.67,58.98,320.55,69.50,38.93,20.86,16.31,32.13,13.33,46.43,9.04,12.84,17.76,37.70,24.26,43.86,33.48,16.88,28.88,28.93,31.54,21.59,30.64,64.63,21.61,22.87,85.16,30.21,19.54,53.56,34.27,9.34,15.23,31.21,44.70,27.26,17.65,38.49,24.65,13.14,28.82,47.02,23.35];
const MDM2_COPYNR_FEMALE = [1.68,1.95,1.58,2.25,1.72,1.91,1.96,1.95,1.84,1.95,1.84,1.87,1.86,1.92,2.62,1.76,2.18,2.17,1.93,2.34,2.24,2.28,1.88,1.91,1.92,2.54,1.93,1.78,1.87,4.95,1.96,2.55,2.04,2.07,2.29,1.95,2.09,1.53,2.19,9.35,1.90,2.08,2.06,2.43,2.01,1.81,2.63,2.01,2.20,1.74,1.84,2.43,1.70,2.09,1.75,4.19,1.88,2.09,1.53,8.60,1.61,1.91,1.91,2.07,2.39,2.71,2.14,1.97,2.04,1.63,1.74,1.85,1.91,1.87,2.01,2.16,3.22,1.97,1.92,2.06,1.93,1.84,1.98,3.52,1.73,1.65,2.20,2.38,1.92,1.92,1.82,1.62,1.76,2.06,1.80,2.02,1.75,1.97,1.92,1.99,1.63,2.13,1.86,1.97,2.01,1.86,2.04,1.93,1.90,1.95,2.01,1.85,2.02,2.04,1.90,1.99,2.08,1.96,1.85,1.77,1.92,1.96,1.96,1.94,2.04,2.07,1.92,1.91,1.83,1.94,1.91,2.05,1.84,1.89,1.90,2.13,2.16,1.78,2.33,1.32,2.03,2.31,1.89,1.80,1.90,1.86,1.76,2.03,1.88,2.29,1.88,2.04,1.99,2.06,2.04,1.98,1.95,2.98,2.07,1.81,1.51,2.15,2.16,1.65,2.37,1.94,1.63,2.23,1.94,2.19,1.87,2.81,2.10,1.90,2.22,2.02,1.96,2.10,2.17,1.96,2.09,1.75,2.27,2.42,1.83,2.13,1.72,2.13,2.34,1.65,2.22,1.95,1.56,2.24,1.77,2.11,1.71,1.87,1.87,1.88,1.91,3.82,2.86,2.34,1.99,2.05,1.82,1.99,2.32,1.81,2.10,1.74,2.70,2.12,2.25,2.24,2.12,2.09,2.00,1.61,2.06,2.07,2.32,2.16,2.49,1.99,2.58,1.71,1.92,2.32,1.94,3.50,2.19,2.72,2.23,1.86,2.23,1.96,2.06,1.97,1.90,2.77,2.41,1.93,1.85,2.13,1.98,2.14,2.79,2.20,1.99,1.93,2.39,2.03,1.74,2.00,1.94,1.83,2.08,1.82,2.26,1.83,3.06,1.91,2.35,2.03,2.24,2.15,1.86,1.49,1.98,2.05,2.07,1.91,1.88,2.18,2.05,1.87,1.91,2.09,1.89,1.86,2.99,2.08,1.82,2.05,1.83,2.25,1.65,2.28,2.01,2.09,2.08,1.99,2.02,1.95,1.78,2.02,2.10,2.75,1.95,1.86,2.07,1.91,2.02,2.07,2.12,1.91,1.99,1.83,2.27,2.04,1.95,1.81,1.59,1.97,1.80,1.83,1.85,2.13,2.06,2.03,2.34,1.98,1.94,2.02,1.84,2.06,1.68,2.00,2.04,2.23,2.23,1.82,1.61,1.91,2.56,1.94,2.17,2.35,2.33,1.94,1.87,1.89,1.95,2.47,3.02,2.20,1.99,1.99,1.74,1.60,4.16,2.00,2.10,1.89,1.79,1.83,2.85,2.12];
const MDM2_COPYNR_MALE = [2.34,2.08,1.62,1.91,1.84,2.13,2.02,2.07,2.35,1.76,1.81,2.00,2.38,2.26,2.27,2.63,1.99,2.22,2.43,1.97,3.29,2.14,1.73,2.08,2.07,2.07,1.97,2.13,2.06,2.02,1.93,2.12,2.02,2.14,3.12,2.28,2.08,1.88,2.22,1.63,2.09,2.32,2.16,1.45,1.78,2.24,1.85,2.03,2.07,1.79,2.54,1.93,1.75,2.04,2.18,1.80,1.94,2.28,1.72,1.96,1.81,1.98,1.99,1.89,2.34,1.88,1.92,1.86,2.06,2.07,2.10,2.53,2.76,1.93,1.97,2.22,1.98,2.03,2.23,1.68,1.90,1.94,2.08,1.94,1.64,1.90,1.91,1.98,1.59,2.05,1.70,1.48,2.00,1.93,2.06,1.62,2.02,2.32,1.69,1.59,1.78,1.78,1.89,2.08,2.13,2.14,2.00,2.24,1.78,1.99,2.21,2.48,1.97,1.89,2.08,1.92,2.17,2.03,2.02,2.05,1.81,1.85,2.06,1.33,1.81,1.91,1.95,1.97,1.76,1.96,1.89,1.77,2.14,1.74,2.03,2.04,2.29,2.09,2.05,2.04,2.63,2.29,2.03,1.31,1.87,2.00,2.25,1.96,2.02,2.15,1.51,1.93,2.30,2.14,2.11,2.22,1.78,2.27,2.06,2.39,1.84,1.98,1.81,2.08,2.08,2.51,1.90,1.80,2.03,1.85,1.98,1.85,1.97,2.37,1.93,2.21,2.10,2.50,1.50,1.92,2.14,2.07,1.85,1.82,1.82,1.86,1.73,2.19,1.92,1.88,2.32,1.72,1.78,1.55,1.60,1.94,1.80,2.37,2.20,1.93,1.45,2.12,2.17,2.10,2.01,1.65,1.90,2.28,2.03,2.02,2.02,1.81,1.98,2.21,2.27,2.00,1.82,2.13,1.98,1.85,1.92,1.92,1.88,1.93,1.99,2.02,2.50,1.74,1.58,1.80,1.84,2.09,1.53,1.83,1.67,1.72,2.03,2.02,1.23,1.33,2.00,2.27,2.09,1.78,1.94,2.05,1.82,1.58,2.21,1.89,2.33,2.14,2.75,1.99,2.34,1.98,1.78,2.11,2.80,2.13,1.90,2.13,1.92,1.96,2.90,2.11,2.15,1.97,1.91,2.12,2.27,1.96,2.15,2.00,2.17,2.07,1.49,2.37,2.50,2.19,2.51,1.57,2.35,2.02,2.33,1.93,2.01,1.86,2.25,2.00,2.28,1.96,1.95,1.88,2.23,1.82,2.54,1.55,1.76,1.77,1.94,1.50,1.90,1.95,2.60,2.22,1.49,2.20,2.07,2.25,1.90,1.82,1.52,2.11,1.55,1.97,1.76,1.87,1.88,1.78,1.85,1.70,2.05,2.49,2.19,2.64,2.13,1.85,2.11,2.23,2.06,1.96,1.90,1.92,2.02,1.68,2.15,2.01,2.29,2.53,2.08,2.34,2.05,2.02,1.81,2.19,2.00,1.80,2.04,2.35,2.00,1.88,2.11,1.97,2.30,2.23,1.92,2.25,1.87,9.30,2.06,2.38,2.48,1.28,1.75,2.14,1.66,1.81,1.56,2.09,2.02,2.20,1.90,1.93,2.05,1.76,1.90,1.91,1.97,1.86,1.59,1.85,2.19,2.16,1.89,2.10,2.01,1.80,1.93,2.02,1.75,2.13,2.47,2.21,1.87,1.56,1.82,2.04,1.85,1.95,2.09,1.87,1.86,1.90,1.90,2.05,1.93,2.38,1.93,1.84,2.11,1.99,2.14,2.16,1.86,2.25,2.23,1.84,1.67,1.72,1.95,1.85,2.03,2.11,2.47,2.54,1.89,1.65,2.23,1.98,1.68,1.85,2.01,1.95,1.75,2.16,2.25,1.47,1.82,2.08,1.65,1.66,2.35,2.32,1.73,1.87,2.16,1.79,1.98,2.04,1.96,1.88];

describe('Spearman Tests', () => {
  const precision = 10;
  let spearmanr;

  beforeAll(function() {
    spearmanr = new SpearmanCorrelation();
  });

  it('Female TPM & Copy Number Correlation', async () => {
    // SpearmanrResult(correlation=0.314405616306186, pvalue=1.0602975468579294e-09)
    const r = await spearmanr.calc(MDM2_TPM_FEMALE, MDM2_COPYNR_FEMALE);
    expect(r.scoreValue).toBeCloseTo(0.314405616306186, precision);
    expect(r.pValue).toBeCloseTo(1.0602975468579294e-09, precision);
  });

  it('Male TPM & Copy Number Correlation', async () => {
    // SpearmanrResult(correlation=0.34911812623950433, pvalue=2.111969653079491e-14)
    const r = await spearmanr.calc(MDM2_TPM_MALE, MDM2_COPYNR_MALE);
    expect(r.scoreValue).toBeCloseTo(0.34911812623950433, precision);
    expect(r.pValue).toBeCloseTo(2.111969653079491e-14, precision);

  });

  it('TPM & Copy Number Correlation', async () => {
    // SpearmanrResult(correlation=0.3355360640166762, pvalue=8.112503784449047e-23)
    const r = await spearmanr.calc(MDM2_TPM_FEMALE.concat(MDM2_TPM_MALE), MDM2_COPYNR_FEMALE.concat(MDM2_COPYNR_MALE));
    expect(r.scoreValue).toBeCloseTo(0.3355360640166762, precision);
    expect(r.pValue).toBeCloseTo(8.112503784449047e-23, precision);
  });
});


