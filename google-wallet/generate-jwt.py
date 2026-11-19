#!/usr/bin/env python3
"""
generate-jwt.py — Construye el enlace "Save to Google Wallet" para un miembro.

Cómo funciona Google Wallet:
1. En Google Pay & Wallet Console creas la LoyaltyClass (la plantilla del
   programa, ver loyaltyClass.json) y publicas la clase.
2. Por cada cliente creas un LoyaltyObject con sus sellos (ver
   loyaltyObject.example.json) llamando a la API REST.
3. Para que el cliente GUARDE la tarjeta, le das un enlace:
       https://pay.google.com/gp/v/save/<JWT>
   El JWT va firmado con RS256 usando una service account de Google Cloud
   con el rol "Wallet Object Issuer". El JWT contiene el objeto (o su
   referencia) y Google lo muestra al cliente para que lo agregue.

Uso:
    export GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/service-account.json
    python3 generate-jwt.py --member SL-0001 --stamps 5 --name "Mariana Torres"

    # O pasando el issuer ID directamente:
    python3 generate-jwt.py --member SL-0001 --stamps 5 --issuer-id 3388000000023246423

El script imprime el enlace "Save to Google Wallet" listo para poner en un QR.

IMPORTANTE: nunca subas el archivo service-account.json al repositorio.
Va en el servidor, fuera del código, con permisos restringidos.
"""

import argparse
import json
import os
import sys

# Dependencias: pip install google-auth PyJWT cryptography
try:
    import jwt  # PyJWT
    from google.oauth2 import service_account
except ImportError as exc:  # pragma: no cover
    sys.exit(
        "Faltan dependencias. Instala con:\n"
        "    pip install google-auth PyJWT cryptography\n"
        f"Detalle: {exc}"
    )

# Issuer ID confirmado el 19 nov 2026 en Google Pay & Wallet Console.
ISSUER_ID = os.environ.get("GOOGLE_WALLET_ISSUER_ID", "3388000000023246423")
CLASS_SUFFIX = "club-smoothie-lab"


def build_loyalty_object(issuer_id: str, member_id: str, stamps: int, name: str) -> dict:
    """Arma el LoyaltyObject del miembro (igual estructura que loyaltyObject.example.json)."""
    return {
        "id": f"{issuer_id}.{member_id}",
        "classId": f"{issuer_id}.{CLASS_SUFFIX}",
        "state": "active",
        "accountId": member_id,
        "accountName": name,
        "loyaltyPoints": {
            "label": "sellos",
            "balance": {"int": str(stamps)},
        },
        "secondaryLoyaltyPoints": {
            "label": "smoothies gratis",
            "balance": {"int": "1" if stamps >= 8 else "0"},
        },
        "barcode": {"type": "QR_CODE", "value": member_id},
    }


def sign_save_jwt(credentials_path: str, issuer_id: str, loyalty_object: dict) -> str:
    """Firma el JWT RS256 que Google Wallet espera en el enlace de guardado."""
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path,
        scopes=["https://www.googleapis.com/auth/wallet_object.issuer"],
    )
    # El "aud" y el "typ" son obligatorios para el flujo "Save to Wallet".
    claims = {
        "iss": credentials.service_account_email,
        "aud": "google",
        "typ": "savetowallet",
        "payload": {"loyaltyObjects": [loyalty_object]},
        # "origins" opcional: dominios autorizados para abrir el enlace.
        "origins": ["https://lealtad.smoothielab.mx"],  # TODO: dominio real
    }
    # PyJWT firma con la llave privada de la service account.
    private_key = credentials.signer.key
    token = jwt.encode(claims, private_key, algorithm="RS256")
    return token


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el enlace Save to Google Wallet.")
    parser.add_argument("--member", required=True, help="ID de miembro, ej. SL-0001")
    parser.add_argument("--stamps", type=int, default=0, help="Sellos actuales del miembro")
    parser.add_argument("--name", default="Miembro del Club", help="Nombre del miembro")
    parser.add_argument("--issuer-id", default=ISSUER_ID, help="Issuer ID de Google Wallet")
    parser.add_argument(
        "--credentials",
        default=os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", ""),
        help="Ruta al JSON de la service account (o variable GOOGLE_APPLICATION_CREDENTIALS)",
    )
    args = parser.parse_args()

    if args.issuer_id == "REEMPLAZAR":
        sys.exit("Falta el issuer ID. Pásalo con --issuer-id o con GOOGLE_WALLET_ISSUER_ID.")
    if not args.credentials or not os.path.exists(args.credentials):
        sys.exit(
            "Falta la service account. Exporta GOOGLE_APPLICATION_CREDENTIALS con la ruta "
            "al JSON descargado de Google Cloud (nunca lo subas al repo)."
        )

    loyalty_object = build_loyalty_object(args.issuer_id, args.member, args.stamps, args.name)
    token = sign_save_jwt(args.credentials, args.issuer_id, loyalty_object)
    save_link = f"https://pay.google.com/gp/v/save/{token}"

    print(json.dumps({"member": args.member, "saveLink": save_link}, indent=2, ensure_ascii=False))
    print()
    print("Pega este enlace en un botón o codifícalo en un QR para el cliente.")


if __name__ == "__main__":
    main()
