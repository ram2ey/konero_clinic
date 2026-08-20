-- ============================================================================
-- Seed: lab test catalogue
-- ============================================================================
-- Source: WHO Model List of Essential In Vitro Diagnostics (EDL), 5th list
--   https://edl.who-healthtechnologies.org/
--
-- The EDL itemises analytes ("Alanine aminotransferase"), but clinicians
-- order panels ("LFT"). Both are seeded: every EDL test under its
-- laboratory discipline, plus a short "Panel" section for the composite
-- orders that get written on a real request form, plus a supplementary
-- section of psychiatric monitoring tests the EDL does not itemise
-- (serum valproate, clozapine level, urine drug screen and similar) —
-- each block is marked below.
--
-- `aliases` carries the shorthand a doctor actually types: 'FBC' has to
-- find 'Complete blood count', 'U&E' the electrolyte panel, 'Mantoux' the
-- tuberculin skin test. The search_text trigger folds aliases into the
-- searchable haystack (see 20260819150000_medication_lab_catalogs.sql).
--
-- Adapt to what the clinic's referral laboratory actually offers — this
-- is a model list, and free-text entry remains available in the UI.
--
-- Idempotent: ON CONFLICT targets lab_tests.name.
-- ============================================================================

insert into public.lab_tests (name, aliases, category, specimen) values
  -- Panels: how orders are usually written, expanded by the lab.
  ('Full blood count', array['FBC', 'CBC', 'Complete blood count', 'Full blood picture'], 'Panel', 'Venous whole blood (EDTA)'),
  ('Urea, electrolytes and creatinine', array['U&E', 'UEC', 'E/U/Cr', 'Renal function tests', 'RFT', 'Kidney function'], 'Panel', 'Serum'),
  ('Liver function tests', array['LFT', 'LFTs', 'Liver panel'], 'Panel', 'Serum'),
  ('Thyroid function tests', array['TFT', 'TFTs', 'Thyroid panel'], 'Panel', 'Serum'),
  ('Lipid profile', array['Lipids', 'Fasting lipid profile', 'Cholesterol panel'], 'Panel', 'Serum'),

  -- Haematology
  ('Haemoglobin', array['Hb', 'Haemoglobin concentration'], 'Haematology', 'Capillary or venous whole blood'),
  ('Haematocrit', array['HCT', 'PCV', 'Packed cell volume'], 'Haematology', 'Venous whole blood'),
  ('Platelet count', array['PLT', 'Platelets'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('White blood cell differential count', array['Differential', 'WBC differential', 'Diff'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Reticulocyte count', array['Retics'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Erythrocyte sedimentation rate', array['ESR', 'Westergren'], 'Haematology', 'Venous whole blood (citrate)'),
  ('Peripheral blood film examination', array['Blood film', 'PBF', 'Blood smear'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Haemoglobin electrophoresis', array['Hb electrophoresis', 'Hb genotype', 'Genotype'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Haemoglobin A, S and C detection', array['Hb variant screen', 'Sickle screen'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Haemoglobin solubility test', array['Sickling test', 'Sickle solubility'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Sodium metabisulfite slide test', array['Sickling test'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Leukaemia immunophenotyping panel (flow cytometry)', array['Leukaemia immunophenotyping', 'Flow cytometry'], 'Haematology', 'Venous whole blood or bone marrow'),
  ('Primary immunodeficiency immunophenotyping panel (flow cytometry)', array['PID immunophenotyping'], 'Haematology', 'Venous whole blood'),
  ('Kleihauer-Betke acid-elution test', array['Kleihauer'], 'Haematology', 'Venous whole blood (EDTA)'),
  ('Body fluids analysis', array['Fluid analysis', 'Pleural fluid', 'Ascitic fluid'], 'Haematology', 'Body fluid'),

  -- Coagulation
  ('Prothrombin time and international normalized ratio', array['PT', 'INR', 'PT/INR'], 'Coagulation', 'Plasma (citrate)'),
  ('Partial thromboplastin time', array['APTT', 'PTT', 'aPTT'], 'Coagulation', 'Plasma (citrate)'),
  ('Fibrinogen activity', array['Fibrinogen'], 'Coagulation', 'Plasma (citrate)'),
  ('D-Dimer', array['D dimer'], 'Coagulation', 'Plasma (citrate)'),

  -- Clinical chemistry
  ('Alanine aminotransferase', array['ALT', 'SGPT'], 'Clinical chemistry', 'Serum or plasma'),
  ('Aspartate aminotransferase', array['AST', 'SGOT'], 'Clinical chemistry', 'Serum or plasma'),
  ('Alkaline phosphatase', array['ALP'], 'Clinical chemistry', 'Serum or plasma'),
  ('Gamma-glutamyl transferase', array['GGT', 'Gamma GT'], 'Clinical chemistry', 'Serum or plasma'),
  ('Total bilirubin', array['TBIL', 'Bilirubin'], 'Clinical chemistry', 'Serum or plasma'),
  ('Direct bilirubin', array['Conjugated bilirubin'], 'Clinical chemistry', 'Serum or plasma'),
  ('Indirect bilirubin', array['Unconjugated bilirubin'], 'Clinical chemistry', 'Serum or plasma'),
  ('Albumin', array['Serum albumin'], 'Clinical chemistry', 'Serum or plasma'),
  ('Total protein', array['Serum protein'], 'Clinical chemistry', 'Serum or plasma'),
  ('Blood urea nitrogen', array['BUN', 'Urea', 'Serum urea'], 'Clinical chemistry', 'Serum or plasma'),
  ('Creatinine', array['Cr', 'Serum creatinine'], 'Clinical chemistry', 'Serum or plasma'),
  ('Sodium', array['Na', 'Serum sodium'], 'Clinical chemistry', 'Serum or plasma'),
  ('Potassium', array['K', 'Serum potassium'], 'Clinical chemistry', 'Serum or plasma'),
  ('Chloride', array['Cl', 'Serum chloride'], 'Clinical chemistry', 'Serum or plasma'),
  ('Total calcium', array['Ca', 'Serum calcium'], 'Clinical chemistry', 'Serum or plasma'),
  ('Ionized calcium', array['iCa'], 'Clinical chemistry', 'Whole blood or serum'),
  ('Magnesium', array['Mg', 'Serum magnesium'], 'Clinical chemistry', 'Serum or plasma'),
  ('Phosphate', array['PO4', 'Phosphorus', 'Serum phosphate'], 'Clinical chemistry', 'Serum or plasma'),
  ('Glucose', array['Blood sugar', 'RBS', 'FBS', 'Random blood sugar', 'Fasting blood sugar'], 'Clinical chemistry', 'Capillary or venous whole blood'),
  ('Glycated haemoglobin (HbA1c)', array['HbA1c', 'A1c', 'Glycated haemoglobin'], 'Clinical chemistry', 'Venous whole blood (EDTA)'),
  ('Total cholesterol', array['Cholesterol'], 'Clinical chemistry', 'Serum or plasma'),
  ('High-density lipoprotein', array['HDL', 'HDL cholesterol'], 'Clinical chemistry', 'Serum or plasma'),
  ('Low-density lipoprotein', array['LDL', 'LDL cholesterol'], 'Clinical chemistry', 'Serum or plasma'),
  ('Triglycerides', array['TG'], 'Clinical chemistry', 'Serum or plasma'),
  ('Uric acid', array['Urate'], 'Clinical chemistry', 'Serum or plasma'),
  ('Amylase', array['Serum amylase'], 'Clinical chemistry', 'Serum or plasma'),
  ('Lipase', array['Serum lipase'], 'Clinical chemistry', 'Serum or plasma'),
  ('Lactate', array['Serum lactate'], 'Clinical chemistry', 'Plasma or CSF'),
  ('Lactate dehydrogenase', array['LDH'], 'Clinical chemistry', 'Serum or plasma'),
  ('C-reactive protein', array['CRP'], 'Clinical chemistry', 'Serum or plasma'),
  ('Procalcitonin', array['PCT'], 'Clinical chemistry', 'Serum or plasma'),
  ('Ferritin', array['Serum ferritin'], 'Clinical chemistry', 'Serum or plasma'),
  ('Iron', array['Serum iron'], 'Clinical chemistry', 'Serum'),
  ('Blood gases', array['ABG', 'Arterial blood gas', 'Blood gas'], 'Clinical chemistry', 'Arterial whole blood'),
  ('Troponin I', array['cTnI'], 'Clinical chemistry', 'Serum or plasma'),
  ('Troponin T', array['cTnT'], 'Clinical chemistry', 'Serum or plasma'),
  ('High-sensitivity troponin I', array['hs-cTnI'], 'Clinical chemistry', 'Serum or plasma'),
  ('High-sensitivity troponin T', array['hs-cTnT'], 'Clinical chemistry', 'Serum or plasma'),
  ('Ketones (dipstick)', array['Ketones', 'Urine ketones'], 'Clinical chemistry', 'Urine or capillary whole blood'),
  ('Cerebrospinal fluid analysis', array['CSF analysis', 'CSF'], 'Clinical chemistry', 'Cerebrospinal fluid'),
  ('Total immunoglobulin A', array['IgA'], 'Clinical chemistry', 'Serum'),
  ('Total immunoglobulin G', array['IgG'], 'Clinical chemistry', 'Serum'),
  ('Total immunoglobulin M', array['IgM'], 'Clinical chemistry', 'Serum'),
  ('Protein electrophoresis', array['SPEP', 'Serum protein electrophoresis'], 'Clinical chemistry', 'Serum or urine'),
  ('Immunofixation electrophoresis', array['IFE'], 'Clinical chemistry', 'Serum or urine'),
  ('Alphafetoprotein', array['AFP'], 'Clinical chemistry', 'Serum'),
  ('Human chorionic gonadotropin beta-subunit', array['beta-hCG', 'hCG', 'Pregnancy test'], 'Clinical chemistry', 'Serum or urine'),
  ('Total prostate-specific antigen', array['PSA', 'tPSA'], 'Clinical chemistry', 'Serum'),
  ('Faecal immunochemical test', array['FIT', 'FOB', 'Faecal occult blood'], 'Clinical chemistry', 'Stool'),

  -- Endocrinology
  ('Thyroid-stimulating hormone', array['TSH'], 'Endocrinology', 'Serum or plasma'),
  ('Total cortisol', array['Cortisol', 'Serum cortisol'], 'Endocrinology', 'Serum or plasma'),
  ('Prolactin', array['PRL', 'Serum prolactin'], 'Endocrinology', 'Serum'),
  ('Progesterone', array['Serum progesterone'], 'Endocrinology', 'Serum'),
  ('Estradiol', array['Oestradiol', 'E2'], 'Endocrinology', 'Serum'),
  ('Total testosterone', array['Testosterone'], 'Endocrinology', 'Serum'),
  ('Follicle-stimulating hormone', array['FSH'], 'Endocrinology', 'Serum'),
  ('Luteinizing hormone', array['LH'], 'Endocrinology', 'Serum'),
  ('Parathyroid hormone', array['PTH'], 'Endocrinology', 'Serum or plasma'),
  ('17-Hydroxyprogesterone', array['17-OHP'], 'Endocrinology', 'Serum or dried blood spot'),

  -- Therapeutic drug monitoring (EDL 5 additions)
  ('Lithium level', array['Serum lithium', 'Lithium'], 'Therapeutic drug monitoring', 'Serum'),
  ('Phenytoin level', array['Serum phenytoin', 'Phenytoin'], 'Therapeutic drug monitoring', 'Serum'),
  ('Methotrexate level', array['Serum methotrexate', 'Methotrexate'], 'Therapeutic drug monitoring', 'Serum'),

  -- Toxicology
  ('Lead', array['Blood lead', 'Lead level'], 'Toxicology', 'Capillary or venous whole blood'),

  -- Urinalysis
  ('Urinalysis (dipstick)', array['Urine dipstick', 'Urine R/E', 'Urinalysis'], 'Urinalysis', 'Urine'),
  ('Urine microscopic examination', array['Urine microscopy', 'Urine M/C/S'], 'Urinalysis', 'Urine'),

  -- Immunohaematology
  ('ABO and Rh blood typing', array['Blood group', 'Grouping', 'Blood typing'], 'Immunohaematology', 'Venous whole blood (EDTA)'),
  ('Blood crossmatching', array['Crossmatch', 'Group and save'], 'Immunohaematology', 'Venous whole blood (EDTA)'),
  ('Direct Coombs test', array['DAT', 'Direct antiglobulin test'], 'Immunohaematology', 'Venous whole blood (EDTA)'),
  ('Indirect Coombs test', array['IAT', 'Indirect antiglobulin test'], 'Immunohaematology', 'Serum or plasma'),

  -- Clinical microbiology
  ('Bacterial culture', array['Culture', 'M/C/S'], 'Clinical microbiology', 'Site-dependent'),
  ('Blood culture', array['BC', 'Blood C/S'], 'Clinical microbiology', 'Venous whole blood'),
  ('Cerebrospinal fluid culture', array['CSF culture'], 'Clinical microbiology', 'Cerebrospinal fluid'),
  ('Stool culture', array['Stool C/S'], 'Clinical microbiology', 'Stool'),
  ('Fungal culture', array['Mycology culture'], 'Clinical microbiology', 'Site-dependent'),
  ('Mycobacterial culture', array['TB culture', 'AFB culture'], 'Clinical microbiology', 'Sputum or other'),
  ('Genus and species identification', array['Organism identification'], 'Clinical microbiology', 'Isolate'),
  ('Antibacterial susceptibility testing', array['Sensitivity', 'C&S', 'Antibiogram'], 'Clinical microbiology', 'Isolate'),
  ('Antifungal susceptibility testing', array['Antifungal sensitivity'], 'Clinical microbiology', 'Isolate'),
  ('Culture-based drug susceptibility testing', array['TB DST', 'Phenotypic DST'], 'Clinical microbiology', 'Isolate'),
  ('Gram stain', array['Gram'], 'Clinical microbiology', 'Site-dependent'),
  ('Ziehl-Neelsen stain', array['ZN stain', 'AFB', 'Acid-fast bacilli'], 'Clinical microbiology', 'Sputum or other'),
  ('Modified acid-fast stain', array['Modified ZN'], 'Clinical microbiology', 'Stool or other'),
  ('Giemsa stain', array['Giemsa'], 'Clinical microbiology', 'Venous whole blood or tissue'),
  ('Indian ink', array['India ink'], 'Clinical microbiology', 'Cerebrospinal fluid'),
  ('Potassium hydroxide (KOH) stain', array['KOH', 'KOH mount'], 'Clinical microbiology', 'Skin, hair or nail'),
  ('Lactophenol cotton blue', array['LPCB'], 'Clinical microbiology', 'Fungal isolate'),
  ('Kato-Katz faecal smear', array['Kato-Katz', 'Stool for ova and parasites'], 'Clinical microbiology', 'Stool'),
  ('Plasmodium spp. microscopic examination', array['Malaria parasites', 'MP', 'BF for MPs', 'Malaria microscopy'], 'Clinical microbiology', 'Venous or capillary whole blood'),
  ('Plasmodium spp. antigen (rapid diagnostic test)', array['Malaria RDT', 'mRDT'], 'Clinical microbiology', 'Capillary whole blood'),

  -- Serology and immunology
  ('Antibodies to HIV 1/2', array['HIV test', 'HIV serology', 'Retroviral screen'], 'Serology and immunology', 'Serum, plasma or whole blood'),
  ('Combined antibodies to HIV 1/2 and p24 antigen', array['HIV Ag/Ab', '4th generation HIV'], 'Serology and immunology', 'Serum or plasma'),
  ('CD4 cell enumeration', array['CD4 count', 'CD4'], 'Serology and immunology', 'Venous whole blood (EDTA)'),
  ('Hepatitis B surface antigen', array['HBsAg'], 'Serology and immunology', 'Serum or plasma'),
  ('Antibodies to hepatitis B surface antigen', array['anti-HBs', 'HBsAb'], 'Serology and immunology', 'Serum or plasma'),
  ('IgM antibodies to hepatitis B core antigen', array['IgM anti-HBc'], 'Serology and immunology', 'Serum or plasma'),
  ('Hepatitis B e antigen', array['HBeAg'], 'Serology and immunology', 'Serum or plasma'),
  ('Antibodies to hepatitis C virus', array['anti-HCV', 'HCV antibody'], 'Serology and immunology', 'Serum or plasma'),
  ('HCV core antigen', array['HCVcAg'], 'Serology and immunology', 'Serum or plasma'),
  ('Combined antibodies to HCV and HCV core antigen', array['HCV Ag/Ab'], 'Serology and immunology', 'Serum or plasma'),
  ('Antibodies to hepatitis D virus', array['anti-HDV'], 'Serology and immunology', 'Serum or plasma'),
  ('IgM antibodies to hepatitis E virus', array['IgM anti-HEV'], 'Serology and immunology', 'Serum or plasma'),
  ('Antibodies to Treponema pallidum', array['Syphilis serology', 'Treponemal test'], 'Serology and immunology', 'Serum or plasma'),
  ('Rapid plasma reagin test', array['RPR'], 'Serology and immunology', 'Serum or plasma'),
  ('Treponema pallidum haemagglutination test', array['TPHA'], 'Serology and immunology', 'Serum or plasma'),
  ('Treponema pallidum passive particle agglutination test', array['TPPA'], 'Serology and immunology', 'Serum or plasma'),
  ('Venereal disease research laboratory test', array['VDRL'], 'Serology and immunology', 'Serum or CSF'),
  ('Combined antibodies to Treponema pallidum and HIV 1/2', array['Dual HIV/syphilis'], 'Serology and immunology', 'Serum, plasma or whole blood'),
  ('Cryptococcal antigen', array['CrAg'], 'Serology and immunology', 'Serum, plasma or CSF'),
  ('Histoplasma capsulatum antigen', array['Histoplasma antigen'], 'Serology and immunology', 'Urine or serum'),
  ('Aspergillus antigen test (galactomannan)', array['Galactomannan'], 'Serology and immunology', 'Serum or BAL'),
  ('Aspergillus IgG antibody', array['Aspergillus serology'], 'Serology and immunology', 'Serum'),
  ('Lipoarabinomannan antigen', array['TB LAM', 'Urine LAM', 'LF-LAM'], 'Serology and immunology', 'Urine'),
  ('Interferon-gamma release assay', array['IGRA', 'Quantiferon'], 'Serology and immunology', 'Venous whole blood'),
  ('Tuberculin skin test (Mantoux)', array['Mantoux', 'TST', 'PPD'], 'Serology and immunology', 'Intradermal'),
  ('Group A Streptococcus antigen', array['Strep A', 'Rapid strep'], 'Serology and immunology', 'Throat swab'),
  ('Dengue virus NS1 antigen', array['Dengue NS1'], 'Serology and immunology', 'Serum or plasma'),
  ('IgM antibodies to dengue virus', array['Dengue IgM'], 'Serology and immunology', 'Serum or plasma'),
  ('Measles IgG/IgM antibodies', array['Measles serology'], 'Serology and immunology', 'Serum'),
  ('Rubella IgG/IgM antibodies', array['Rubella serology'], 'Serology and immunology', 'Serum'),
  ('IgM antibodies to zika virus', array['Zika IgM'], 'Serology and immunology', 'Serum'),
  ('Trypanosoma cruzi IgG antibody', array['Chagas serology'], 'Serology and immunology', 'Serum'),
  ('Antibodies to recombinant K39 antigen', array['rK39', 'Kala-azar RDT'], 'Serology and immunology', 'Serum or whole blood'),
  ('Direct agglutination test for visceral leishmaniasis', array['DAT leishmaniasis'], 'Serology and immunology', 'Serum'),
  ('Antibodies to Plasmodium spp.', array['Malaria serology'], 'Serology and immunology', 'Serum'),
  ('Vibrio cholerae antigen', array['Cholera RDT'], 'Serology and immunology', 'Stool'),
  ('SARS-CoV-2 antigen', array['COVID antigen', 'COVID RDT'], 'Serology and immunology', 'Nasopharyngeal swab'),
  ('Clostridioides difficile antigen and toxins', array['C difficile toxin', 'C diff'], 'Serology and immunology', 'Stool'),
  ('Glucose-6-phosphate dehydrogenase (qualitative)', array['G6PD', 'G6PD screen'], 'Serology and immunology', 'Capillary or venous whole blood'),
  ('Glucose-6-phosphate dehydrogenase (semi-quantitative)', array['G6PD quantitative'], 'Serology and immunology', 'Capillary or venous whole blood'),

  -- Molecular diagnostics
  ('Mycobacterium tuberculosis NAAT', array['GeneXpert', 'Xpert MTB/RIF', 'TB PCR'], 'Molecular diagnostics', 'Sputum or other'),
  ('Combined Mycobacterium tuberculosis NAAT with drug resistance', array['Xpert MTB/RIF Ultra'], 'Molecular diagnostics', 'Sputum or other'),
  ('NAAT for tuberculosis drug resistance detection', array['Line probe assay', 'TB LPA'], 'Molecular diagnostics', 'Sputum or isolate'),
  ('NAAT for pyrazinamide resistance', array['PZA resistance'], 'Molecular diagnostics', 'Isolate'),
  ('Targeted next-generation sequencing for tuberculosis drug resistance', array['TB tNGS'], 'Molecular diagnostics', 'Sputum or isolate'),
  ('Qualitative HIV NAAT', array['HIV DNA PCR', 'Early infant diagnosis', 'EID'], 'Molecular diagnostics', 'Dried blood spot or whole blood'),
  ('Quantitative HIV NAAT', array['HIV viral load', 'Viral load'], 'Molecular diagnostics', 'Plasma or dried blood spot'),
  ('HCV NAAT', array['HCV RNA', 'HCV PCR'], 'Molecular diagnostics', 'Plasma or serum'),
  ('Quantitative HBV NAAT', array['HBV viral load', 'HBV DNA'], 'Molecular diagnostics', 'Plasma or serum'),
  ('Quantitative HDV NAAT', array['HDV RNA'], 'Molecular diagnostics', 'Plasma or serum'),
  ('Hepatitis E virus NAAT', array['HEV RNA'], 'Molecular diagnostics', 'Serum or stool'),
  ('Human papillomavirus NAAT', array['HPV DNA', 'HPV test'], 'Molecular diagnostics', 'Cervical swab'),
  ('Chlamydia trachomatis and Neisseria gonorrhoeae NAAT', array['CT/NG', 'CT NG PCR'], 'Molecular diagnostics', 'Swab or urine'),
  ('Influenza A and B NAAT', array['Influenza PCR', 'Flu PCR'], 'Molecular diagnostics', 'Nasopharyngeal swab'),
  ('SARS-CoV-2 NAAT', array['COVID PCR', 'SARS-CoV-2 PCR'], 'Molecular diagnostics', 'Nasopharyngeal swab'),
  ('Measles NAAT', array['Measles PCR'], 'Molecular diagnostics', 'Throat swab or urine'),
  ('Zika virus NAAT', array['Zika PCR'], 'Molecular diagnostics', 'Serum or urine'),
  ('Dengue virus NAAT', array['Dengue PCR'], 'Molecular diagnostics', 'Serum'),
  ('Bordetella pertussis NAAT', array['Pertussis PCR'], 'Molecular diagnostics', 'Nasopharyngeal swab'),
  ('Mpox NAAT', array['Mpox PCR', 'Monkeypox PCR'], 'Molecular diagnostics', 'Lesion swab'),
  ('Pneumocystis jirovecii NAAT', array['PCP PCR', 'PJP PCR'], 'Molecular diagnostics', 'Sputum or BAL'),
  ('Meningitis NAAT multiplex panel', array['Meningitis panel', 'CSF PCR panel'], 'Molecular diagnostics', 'Cerebrospinal fluid'),
  ('BCR-ABL1 transcript detection', array['BCR-ABL'], 'Molecular diagnostics', 'Whole blood or bone marrow'),
  ('EGFR gene mutation', array['EGFR mutation'], 'Molecular diagnostics', 'Tumour tissue'),

  -- Anatomical pathology
  ('Histopathological examination', array['Histology', 'Biopsy', 'Histopath'], 'Anatomical pathology', 'Tissue'),
  ('Cytopathological examination', array['Cytology', 'FNA'], 'Anatomical pathology', 'Cells or fluid'),
  ('Papanicolaou stain', array['Pap smear', 'Pap'], 'Anatomical pathology', 'Cervical smear'),
  ('Immunohistochemistry', array['IHC'], 'Anatomical pathology', 'Tissue'),
  ('Estrogen and progesterone receptor immunohistochemistry', array['ER/PR'], 'Anatomical pathology', 'Tumour tissue'),
  ('HER2 immunohistochemistry', array['HER2'], 'Anatomical pathology', 'Tumour tissue'),
  ('Immunohistochemical panel for haematologic malignancies', array['Haematology IHC panel'], 'Anatomical pathology', 'Tissue or bone marrow'),
  ('Immunohistochemical panel for solid tumours', array['Solid tumour IHC panel'], 'Anatomical pathology', 'Tumour tissue'),

  -- Supplementary: routine psychiatric monitoring not itemised by the EDL.
  ('Valproate level', array['Serum valproate', 'VPA level', 'Sodium valproate level'], 'Therapeutic drug monitoring', 'Serum'),
  ('Clozapine level', array['Serum clozapine'], 'Therapeutic drug monitoring', 'Serum'),
  ('Carbamazepine level', array['Serum carbamazepine'], 'Therapeutic drug monitoring', 'Serum'),
  ('Urine drug screen', array['UDS', 'Drugs of abuse screen', 'Toxicology screen'], 'Toxicology', 'Urine'),
  ('Blood alcohol concentration', array['BAC', 'Ethanol level'], 'Toxicology', 'Serum or whole blood'),
  ('Vitamin B12', array['B12', 'Cobalamin'], 'Clinical chemistry', 'Serum'),
  ('Serum folate', array['Folate'], 'Clinical chemistry', 'Serum'),
  ('25-hydroxyvitamin D', array['Vitamin D', 'Vit D', '25-OH vitamin D'], 'Clinical chemistry', 'Serum'),
  ('Creatine kinase', array['CK', 'CPK'], 'Clinical chemistry', 'Serum or plasma')
on conflict (name) do nothing;
