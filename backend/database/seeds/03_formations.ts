import { query } from '../../src/config/db';
import { WELL_IDS } from './02_wells';

export const FORMATION_IDS: Record<string, string> = {
  NHK_TIPAM:   '20000000-0000-0000-0000-000000000001',
  NHK_BARAIL:  '20000000-0000-0000-0000-000000000002',
  MRN_BARAIL:  '20000000-0000-0000-0000-000000000003',
  MRN_KOPILI:  '20000000-0000-0000-0000-000000000004',
  JRJ_KOPILI:  '20000000-0000-0000-0000-000000000005',
  HGJ_TIPAM:   '20000000-0000-0000-0000-000000000006',
  LKW_SYLHET:  '20000000-0000-0000-0000-000000000007',
  GLK_GIRUJAN: '20000000-0000-0000-0000-000000000008',
  DKM_BARAIL:  '20000000-0000-0000-0000-000000000009',
  SBS_NAMSANG: '20000000-0000-0000-0000-000000000010',
};

export async function seedFormations(): Promise<void> {
  const formations = [
    {
      id: FORMATION_IDS.NHK_TIPAM, well_id: WELL_IDS.NAHARKATIA_A1,
      formation_name: 'Tipam Sandstone', top_depth_ft: 4200, bottom_depth_ft: 6800,
      lithology: 'Fine-medium grained sandstone with shale interbeds',
      pore_pressure_psi: 5800, fracture_gradient: 0.72,
      reservoir_notes: 'Primary reservoir. Good porosity (18-22%). Moderate permeability. Prone to mud losses at top.',
    },
    {
      id: FORMATION_IDS.NHK_BARAIL, well_id: WELL_IDS.NAHARKATIA_A1,
      formation_name: 'Barail Sandstone', top_depth_ft: 7200, bottom_depth_ft: 9100,
      lithology: 'Coarse grained sandstone, arkosic',
      pore_pressure_psi: 7200, fracture_gradient: 0.81,
      reservoir_notes: 'Secondary reservoir target. High overpressure risk below 8000 ft.',
    },
    {
      id: FORMATION_IDS.MRN_BARAIL, well_id: WELL_IDS.MORAN_B2,
      formation_name: 'Barail Sandstone', top_depth_ft: 5800, bottom_depth_ft: 8400,
      lithology: 'Medium grained sandstone',
      pore_pressure_psi: 6900, fracture_gradient: 0.79,
      reservoir_notes: 'Primary target. Encountered stuck pipe at 7600 ft in offset wells.',
    },
    {
      id: FORMATION_IDS.MRN_KOPILI, well_id: WELL_IDS.MORAN_B2,
      formation_name: 'Kopili Shale', top_depth_ft: 3000, bottom_depth_ft: 5600,
      lithology: 'Dark grey calcareous shale',
      pore_pressure_psi: 4100, fracture_gradient: 0.65,
      reservoir_notes: 'Reactive shale — borehole instability observed in multiple offsets.',
    },
    {
      id: FORMATION_IDS.JRJ_KOPILI, well_id: WELL_IDS.JORAJAN_C1,
      formation_name: 'Kopili Shale', top_depth_ft: 2800, bottom_depth_ft: 5200,
      lithology: 'Calcareous shale with limestone stringers',
      pore_pressure_psi: 3800, fracture_gradient: 0.63,
      reservoir_notes: 'Kicks reported at 4200-4600 ft interval.',
    },
    {
      id: FORMATION_IDS.HGJ_TIPAM, well_id: WELL_IDS.HUGRIJAN_D3,
      formation_name: 'Tipam Sandstone', top_depth_ft: 3900, bottom_depth_ft: 6500,
      lithology: 'Fine grained sandstone',
      pore_pressure_psi: 5400, fracture_gradient: 0.70,
      reservoir_notes: 'Mud losses encountered at 5100 ft in nearby Jorajan offsets.',
    },
    {
      id: FORMATION_IDS.LKW_SYLHET, well_id: WELL_IDS.LAKWA_E2,
      formation_name: 'Sylhet Limestone', top_depth_ft: 4600, bottom_depth_ft: 6200,
      lithology: 'Fractured limestone with vuggy porosity',
      pore_pressure_psi: 5200, fracture_gradient: 0.68,
      reservoir_notes: 'Severe mud losses due to fracture system. Partial returns only.',
    },
    {
      id: FORMATION_IDS.GLK_GIRUJAN, well_id: WELL_IDS.GELEKI_F1,
      formation_name: 'Girujan Clay', top_depth_ft: 1800, bottom_depth_ft: 3200,
      lithology: 'Soft plastic clay with occasional sand streaks',
      pore_pressure_psi: 2800, fracture_gradient: 0.56,
      reservoir_notes: 'Hole enlargement and washout common. Caving shale risk.',
    },
    {
      id: FORMATION_IDS.DKM_BARAIL, well_id: WELL_IDS.DIKOM_G2,
      formation_name: 'Barail Sandstone', top_depth_ft: 5200, bottom_depth_ft: 7800,
      lithology: 'Medium-coarse sandstone, occasionally conglomeratic',
      pore_pressure_psi: 6600, fracture_gradient: 0.77,
      reservoir_notes: 'Good producer. Moderate overpressure at 7000 ft.',
    },
    {
      id: FORMATION_IDS.SBS_NAMSANG, well_id: WELL_IDS.SIBSAGAR_H1,
      formation_name: 'Namsang Sandstone', top_depth_ft: 8500, bottom_depth_ft: 12000,
      lithology: 'Coarse arkosic sandstone with conglomerate beds',
      pore_pressure_psi: 10200, fracture_gradient: 0.88,
      reservoir_notes: 'Deep high-pressure target. Kick risk significant. Wellbore stability issues expected.',
    },
  ];

  for (const f of formations) {
    await query(
      `INSERT IGNORE INTO well_formations
        (id, well_id, formation_name, top_depth_ft, bottom_depth_ft, lithology,
         pore_pressure_psi, fracture_gradient, reservoir_notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        f.id, f.well_id, f.formation_name, f.top_depth_ft, f.bottom_depth_ft,
        f.lithology, f.pore_pressure_psi, f.fracture_gradient, f.reservoir_notes,
      ]
    );
  }

  console.log(`  ✔ Seeded ${formations.length} formations`);
}
