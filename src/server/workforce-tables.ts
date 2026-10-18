import { db } from '../db/index.ts';
import { sql } from 'drizzle-orm';

export async function ensureWorkforceTables() {
  try {
    await db.execute(sql`SELECT 1 FROM workforce_people LIMIT 1`);

    // Create Training Providers table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workforce_training_providers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        website TEXT,
        booking_url TEXT NOT NULL,
        courses_offered TEXT,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    // Create Training Sessions table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workforce_training_sessions (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        course_name TEXT NOT NULL,
        qualification_type_code TEXT NOT NULL,
        provider_id INTEGER REFERENCES workforce_training_providers(id),
        provider_name TEXT NOT NULL,
        booking_url TEXT,
        session_date TEXT NOT NULL,
        start_time TEXT DEFAULT '07:00' NOT NULL,
        end_time TEXT DEFAULT '11:00' NOT NULL,
        location TEXT NOT NULL,
        booking_reference TEXT,
        status TEXT DEFAULT 'Booked' NOT NULL,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    // Create Training Attendees table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workforce_training_attendees (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES workforce_training_sessions(id) ON DELETE CASCADE NOT NULL,
        person_id INTEGER REFERENCES workforce_people(id) NOT NULL,
        attendance_status TEXT DEFAULT 'Scheduled' NOT NULL,
        certificate_status TEXT DEFAULT 'Awaiting Certificate' NOT NULL,
        evidence_url TEXT,
        verified_at TIMESTAMP,
        verified_by TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    // Seed default providers if empty
    const providersRes = await db.execute(sql`SELECT count(*) as count FROM workforce_training_providers`);
    const count = Number(providersRes.rows[0]?.count || 0);
    if (count === 0) {
      await db.execute(sql`
        INSERT INTO workforce_training_providers (name, website, booking_url, courses_offered, contact_name, phone, email, notes, is_active)
        VALUES 
          ('RelyOn Nutec Melbourne', 'https://relyonnutec.com', 'https://relyonnutec.com/en-au/courses/electrical-safety', 'CPR (HLTAID009), Low Voltage Rescue (UETDRMP007), Working at Heights, EWP', 'Gemma Davies', '1300 735 966', 'bookings.melb@relyonnutec.com', 'Preferred provider for electrical rescue recertification and site inductions.', true),
          ('Apex Safety & Training Group', 'https://apexsafety.edu.au', 'https://apexsafety.edu.au/bookings/corporate', 'CPR, LVR Refresher, Provide First Aid, Confined Space', 'Shane Thomas', '(03) 9811 4400', 'enrol@apexsafety.edu.au', 'On-site mobile unit available for crews > 8 people. 10% JV corporate discount.', true),
          ('St John Ambulance Victoria', 'https://stjohnvic.com.au', 'https://stjohnvic.com.au/first-aid-training', 'CPR (HLTAID009), Provide First Aid (HLTAID011), Advanced Resuscitation', 'Corporate Bookings Desk', '1300 360 455', 'courses@stjohnvic.com.au', 'Accredited national RTO. Certificates issued within 24h of completion.', true),
          ('Fire & Safety Australia', 'https://fireandsafetyaustralia.com.au', 'https://fireandsafetyaustralia.com.au/courses', 'Working at Heights, Enter & Work in Confined Spaces, Fire Warden', 'Marcus Trent', '1300 88 55 30', 'training@fsa.com.au', 'Specialist high-risk licence provider.', true)
      `);
    }

  } catch (err) {
    console.warn('workforce tables setup notice:', err);
  }
}
