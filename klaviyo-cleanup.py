"""
Klaviyo Profile Cleanup — Jack Turner
======================================
Fase 1: Exporta TODOS los profiles a backup JSON.
Fase 2: Conserva los 100 más recientes de la lista Newsletter (TWy4DM).
         Borra todos los demás.

Uso:
  python3 klaviyo-cleanup.py --export        # Solo exporta (seguro)
  python3 klaviyo-cleanup.py --cleanup       # Exporta + borra
"""

import requests
import json
import time
import argparse
from datetime import datetime

# ── Credenciales ──────────────────────────────────────────────────────────────
PRIVATE_KEY = 'pk_ae78fcf3eca25b3f0bf11938fac1afa77a'
LIST_ID     = 'TWy4DM'  # Newsletter list

HEADERS = {
    'Authorization': f'Klaviyo-API-Key {PRIVATE_KEY}',
    'revision': '2024-10-15',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}

BASE_URL = 'https://a.klaviyo.com/api'

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_all_profiles():
    """Descarga todos los profiles paginando con cursor."""
    profiles = []
    url = f'{BASE_URL}/profiles/?page[size]=100&fields[profile]=email,first_name,last_name,created,updated'
    print('Descargando todos los profiles...')
    while url:
        r = requests.get(url, headers=HEADERS)
        r.raise_for_status()
        data = r.json()
        batch = data.get('data', [])
        profiles.extend(batch)
        print(f'  {len(profiles)} profiles descargados...', end='\r')
        url = data.get('links', {}).get('next')
        if url:
            time.sleep(0.25)  # Rate limit cortés
    print(f'\nTotal profiles: {len(profiles)}')
    return profiles


def get_newsletter_last_100():
    """Obtiene los 100 profiles más recientes de la lista Newsletter."""
    profiles = []
    # sort=-joined_group_at → más recientes primero
    url = (
        f'{BASE_URL}/lists/{LIST_ID}/profiles/'
        f'?page[size]=100&sort=-joined_group_at'
        f'&fields[profile]=email,created'
    )
    print(f'\nObteniendo los 100 más recientes de la lista {LIST_ID}...')
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    data = r.json()
    profiles = data.get('data', [])
    print(f'  {len(profiles)} profiles en la lista (tomando primeros 100)')
    return profiles[:100]


def suppress_profiles_batch(emails):
    """Suprime hasta 100 profiles por email (no cuentan contra el límite del plan)."""
    url = f'{BASE_URL}/profile-suppression-bulk-create-jobs/'
    body = {
        'data': {
            'type': 'profile-suppression-bulk-create-job',
            'attributes': {
                'profiles': {
                    'data': [{'type': 'profile', 'attributes': {'email': e}} for e in emails]
                }
            }
        }
    }
    r = requests.post(url, headers=HEADERS, json=body)
    return r.status_code in (200, 202)


# ── Fase 1: Exportar ──────────────────────────────────────────────────────────

def run_export():
    all_profiles = get_all_profiles()
    timestamp    = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename     = f'klaviyo-backup-{timestamp}.json'
    filepath     = f'/Users/santiagosalinas/Documents/Shopify-Projects/Jack Turner/{filename}'
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(all_profiles, f, ensure_ascii=False, indent=2)
    print(f'\nBackup guardado → {filename}')
    return all_profiles, filepath


# ── Fase 2: Cleanup ───────────────────────────────────────────────────────────

def run_cleanup():
    # 1. Exportar primero
    all_profiles, backup_file = run_export()

    # 2. Obtener los 100 a conservar
    keep_profiles = get_newsletter_last_100()
    keep_ids      = {p['id'] for p in keep_profiles}

    print(f'\nProfiles a conservar: {len(keep_ids)}')
    print('Emails que se conservan:')
    for p in keep_profiles:
        email = p.get('attributes', {}).get('email', '—')
        print(f'  · {email}')

    # 3. Calcular los que se borran
    to_delete = [p for p in all_profiles if p['id'] not in keep_ids]
    print(f'\nProfiles a eliminar: {len(to_delete)}')

    # 4. Confirmación final
    confirm = input('\n⚠️  ¿Confirmas borrar estos profiles? (escribe "si" para continuar): ')
    if confirm.strip().lower() != 'si':
        print('Cancelado. Backup ya guardado en:', backup_file)
        return

    # 5. Suprimir en batches de 100
    emails_to_suppress = [
        p.get('attributes', {}).get('email')
        for p in to_delete
        if p.get('attributes', {}).get('email')
    ]

    suppressed = 0
    errors     = 0
    batch_size = 100
    total      = len(emails_to_suppress)

    for i in range(0, total, batch_size):
        batch = emails_to_suppress[i:i + batch_size]
        ok    = suppress_profiles_batch(batch)
        if ok:
            suppressed += len(batch)
        else:
            errors += len(batch)
            print(f'  ERROR en batch {i//batch_size + 1}')
        print(f'  Progreso: {min(i+batch_size, total)}/{total} — suprimidos: {suppressed}, errores: {errors}', end='\r')
        time.sleep(0.5)

    print(f'\n\nListo.')
    print(f'  ✓ Suprimidos: {suppressed}')
    print(f'  ✗ Errores:    {errors}')
    print(f'  ✓ Conservados: {len(keep_ids)}')
    print(f'  Backup:       {backup_file}')


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--export',  action='store_true', help='Solo exporta backup')
    parser.add_argument('--cleanup', action='store_true', help='Exporta + borra')
    args = parser.parse_args()

    if args.export:
        run_export()
    elif args.cleanup:
        run_cleanup()
    else:
        print(__doc__)
