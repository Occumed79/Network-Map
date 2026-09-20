"""Regression coverage for the publishing ministry's January 2026 schema."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("refes", Path(__file__).with_name("normalize-argentina-refes.py"))
refes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refes)


class RefesSchemaTests(unittest.TestCase):
    def test_ids_are_not_names_or_locations(self):
        row = {
            "establecimiento_id": "123456",
            "establecimiento_nombre": "Centro de Salud\nPrueba",
            "localidad_id": "991",
            "localidad_nombre": "Ciudad Prueba",
            "provincia_id": "2",
            "provincia_nombre": "Buenos Aires",
            "departamento_id": "11",
            "departamento_nombre": "Departamento Prueba",
            "tipologia_id": "7",
            "tipologia_nombre": "Centro de salud",
            "cp": "1000",
            "domicilio": "Calle Prueba 100",
            "sitio_web": "https://example.org",
            "longitud": "-58,3816",
            "latitud": "-34,6037",
        }
        result = dict(zip(refes.COLUMNS, refes.normalize(row)))
        self.assertEqual(result["source_record_id"], "refes:123456")
        self.assertEqual(result["name"], "Centro de Salud Prueba")
        self.assertEqual(result["city"], "Ciudad Prueba")
        self.assertEqual(result["state_region"], "Buenos Aires")
        self.assertIn("Departamento Prueba", result["formatted_address"])
        self.assertEqual(result["primary_provider_type"], "general_practitioner")
        self.assertEqual(result["website"], "https://example.org")
        self.assertEqual(result["lat"], "-34.60370000")
        self.assertEqual(result["lng"], "-58.38160000")

    def test_missing_name_does_not_fall_back_to_numeric_id(self):
        self.assertIsNone(refes.normalize({"establecimiento_id": "123", "latitud": -34.6, "longitud": -58.4}))

    def test_legacy_explicit_columns_still_work(self):
        result = dict(zip(refes.COLUMNS, refes.normalize({
            "codigo_refes": "123", "nombre_establecimiento": "Hospital Prueba",
            "latitud": -34.6, "longitud": -58.4, "localidad": "Ciudad",
        })))
        self.assertEqual(result["name"], "Hospital Prueba")
        self.assertEqual(result["source_record_id"], "refes:123")


if __name__ == "__main__":
    unittest.main()
