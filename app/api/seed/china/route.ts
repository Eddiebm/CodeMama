import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── 50 top Chinese oncology pharma & biotech companies ──────────────────────
// Curated for active BD/licensing interest in oncology
// contactName/contactTitle = publicly-known CEO/founder; verify before sending
const CHINA_ONCOLOGY: Array<{
  name: string;
  interest: string;
  contactName?: string;
  contactTitle?: string;
}> = [
  // Tier 1 — Global BD machines (actively in-licensing Western assets)
  { name: 'BeiGene',                         interest: 'Oncology hematology solid tumors immuno-oncology',
    contactName: 'John Oyler',               contactTitle: 'Co-Founder & Chief Executive Officer' },
  { name: 'Zai Lab',                         interest: 'Oncology solid tumors neuroscience pain',
    contactName: 'Samantha Du',              contactTitle: 'Founder & Chief Executive Officer' },
  { name: 'HUTCHMED',                        interest: 'Oncology gastrointestinal kinase inhibitors',
    contactName: 'Christian Hogg',           contactTitle: 'Chief Executive Officer' },
  { name: 'Innovent Biologics',              interest: 'Oncology metabolism PD-1 combinations',
    contactName: 'Michael Yu',               contactTitle: 'Founder, Chairman & Chief Executive Officer' },
  { name: 'CStone Pharmaceuticals',          interest: 'Oncology immuno-oncology solid tumors',
    contactName: 'Frank Jiang',              contactTitle: 'Chief Executive Officer' },
  { name: 'Legend Biotech',                  interest: 'Hematologic malignancies CAR-T cell therapy',
    contactName: 'Ying Huang',               contactTitle: 'Chief Executive Officer' },
  { name: 'Junshi Biosciences',              interest: 'Oncology autoimmune PD-1 combinations',
    contactName: 'Ning Li',                  contactTitle: 'Founder & Chairman' },
  { name: 'RemeGen',                         interest: 'Oncology ADC autoimmune HER2',
    contactName: 'Jianmin Fang',             contactTitle: 'Founder & Chief Executive Officer' },
  { name: 'Everest Medicines',               interest: 'Oncology renal anti-infectives',
    contactName: 'Kerry Blanchard',          contactTitle: 'President & Chief Executive Officer' },
  { name: 'Gracell Biotechnologies',         interest: 'Oncology CAR-T cell therapy hematology' },

  // Tier 2 — Large integrated pharma with active licensing budgets
  { name: 'Hengrui Medicine',                interest: 'Oncology analgesia cardiovascular small molecules' },
  { name: 'CSPC Pharmaceutical Group',       interest: 'Oncology anti-tumor nanoparticle delivery' },
  { name: 'Sino Biopharmaceutical',          interest: 'Oncology hepatology respiratory' },
  { name: 'Chia Tai Tianqing Pharmaceutical',interest: 'Oncology anti-tumor combination therapies' },
  { name: 'Luye Pharma Group',               interest: 'Oncology CNS cardiovascular' },
  { name: 'Simcere Pharmaceutical',          interest: 'Oncology CNS anti-infectives' },
  { name: 'Livzon Pharmaceutical Group',     interest: 'Oncology digestive system gastrointestinal' },
  { name: 'Hansoh Pharmaceutical',           interest: 'Oncology targeted therapy small molecule' },
  { name: 'Qilu Pharmaceutical',             interest: 'Oncology innovative generics biologics' },
  { name: 'Shandong Buchang Pharmaceuticals',interest: 'Oncology cardiovascular neurology' },

  // Tier 3 — Rising oncology biotech (pre-revenue to commercial)
  { name: 'Abbisko Therapeutics',            interest: 'Oncology kinase inhibitors targeted therapy' },
  { name: 'Jacobio Pharmaceuticals',         interest: 'Oncology RAS pathway precision medicine' },
  { name: 'Kelun-Biotech',                   interest: 'Oncology ADC antibody drug conjugates' },
  { name: 'Harbour BioMed',                  interest: 'Oncology bispecific antibodies HCAb' },
  { name: 'Bio-Thera Solutions',             interest: 'Oncology biosimilars monoclonal antibodies' },
  { name: 'Genor Biopharma',                 interest: 'Oncology autoimmune HER2 PD-L1' },
  { name: 'Ascentage Pharma',                interest: 'Oncology apoptosis BCL-2 MDM2 inhibitors' },
  { name: 'Laekna Therapeutics',             interest: 'Oncology cell cycle CDK breast cancer' },
  { name: 'Mabspace Biosciences',            interest: 'Oncology HER2 antibody engineering' },
  { name: 'Connect Biopharm',                interest: 'Oncology GI inflammatory disease' },
  { name: 'Adagene',                         interest: 'Oncology antibody engineering SAFEbody' },
  { name: 'AnHeart Therapeutics',            interest: 'Oncology thoracic lung NSCLC' },
  { name: 'Transcenta Holding',              interest: 'Oncology antibody solid tumors' },
  { name: 'Haihe Biopharma',                 interest: 'Oncology solid tumors targeted therapy' },
  { name: 'SinoMab BioScience',              interest: 'Oncology autoimmune antibody therapies' },
  { name: 'Nanjing SIMCERE Zaiming',         interest: 'Oncology hematology BTK inhibitors' },
  { name: 'Shenzhen Chipscreen Biosciences', interest: 'Oncology epigenetics HDAC inhibitors' },
  { name: 'Betta Pharmaceuticals',           interest: 'Oncology EGFR lung cancer small molecule' },
  { name: 'Lee\'s Pharmaceutical Holdings', interest: 'Oncology specialty rare diseases' },
  { name: 'Lanova Medicines',                interest: 'Oncology small molecule kinase' },

  // Tier 4 — Strategic HK/SG-based with China BD access
  { name: 'CARsgen Therapeutics',            interest: 'Oncology CAR-T solid tumors GPC3' },
  { name: 'Nuvation Bio (China)',            interest: 'Oncology differentiated tumors' },
  { name: 'Elevation Oncology China',        interest: 'Oncology HER2 biomarker-selected' },
  { name: 'Pyxis Oncology China',            interest: 'Oncology ADC antibody' },
  { name: 'GenScript Biotech',               interest: 'Oncology cell therapy biologics tools' },
  { name: 'Hua Medicine',                    interest: 'Oncology metabolic endocrinology' },
  { name: 'Nanjing Sanhome Pharmaceutical',  interest: 'Oncology targeted small molecules' },
  { name: 'Sinovent Therapeutics',           interest: 'Oncology respiratory solid tumors' },
  { name: 'MabPlex International',           interest: 'Oncology antibody biomanufacturing BD' },
  { name: 'Kineta (China BD)',               interest: 'Oncology immunology innate immune' },
];

export async function POST() {
  try {
    const existing = await db.partner.findMany({
      select: { id: true, name: true, contactName: true },
    });
    const existingMap = new Map(existing.map(p => [p.name.toLowerCase().trim(), p]));

    let created = 0;
    let updated = 0;
    let duplicates = 0;

    for (const co of CHINA_ONCOLOGY) {
      const key = co.name.toLowerCase().trim();
      const found = existingMap.get(key);

      if (found) {
        // Already exists — backfill contact if missing and we have data
        if (!found.contactName && co.contactName) {
          await db.partner.update({
            where: { id: found.id },
            data: { contactName: co.contactName, contactTitle: co.contactTitle },
          });
          updated++;
        } else {
          duplicates++;
        }
      } else {
        await db.partner.create({
          data: {
            name: co.name,
            region: 'CN',
            interest: co.interest,
            status: 'NEW',
            contactName: co.contactName,
            contactTitle: co.contactTitle,
          },
        });
        existingMap.set(key, { id: '', name: co.name, contactName: co.contactName ?? null });
        created++;
      }
    }

    return NextResponse.json({ created, updated, duplicates });
  } catch (err: any) {
    console.error('China seed error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
