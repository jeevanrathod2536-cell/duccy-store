import os, tempfile, unittest
handle,path=tempfile.mkstemp(suffix=".db")
os.close(handle)
os.environ["DATABASE_PATH"]=path
from app import app
class StoreTests(unittest.TestCase):
    def setUp(self): self.client=app.test_client()
    def test_home(self): self.assertEqual(self.client.get("/").status_code,200)
    def test_catalog(self): self.assertEqual(len(self.client.get("/api/products").get_json()),24)
    def test_order(self):
        r=self.client.post("/api/orders",json={"items":[{"id":1,"size":"M","quantity":2}],"coupon":"DUCCY10"})
        self.assertEqual(r.status_code,201)
        self.assertEqual(r.get_json()["total"],1079)
    def test_invalid(self):
        for payload in [{},{"items":[{"id":1,"size":"M","quantity":-1}]},{"items":[{"id":999,"size":"M","quantity":1}]},{"items":[None]}]:
            self.assertEqual(self.client.post("/api/orders",json=payload).status_code,400)
if __name__=="__main__":
    try: unittest.main()
    finally: os.unlink(path)
