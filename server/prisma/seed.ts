import { PrismaClient, Role, ProductStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando la carga de seed idempotente para StockHub ERP...');

  // ================= BODEGAS =================
  const bodegaCentral = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { name: 'Bodega Central', location: 'Casa Matriz - Sector A', isActive: true },
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'Bodega Central', location: 'Casa Matriz - Sector A', isActive: true },
  });

  const bodegaNorte = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { name: 'Bodega Norte', location: 'Sucursal Norte', isActive: true },
    create: { id: '00000000-0000-0000-0000-000000000002', name: 'Bodega Norte', location: 'Sucursal Norte', isActive: true },
  });

  const bodegaSur = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: { name: 'Bodega Sur', location: 'Sucursal Sur', isActive: true },
    create: { id: '00000000-0000-0000-0000-000000000003', name: 'Bodega Sur', location: 'Sucursal Sur', isActive: true },
  });

  console.log(`✅ Bodegas listas: ${bodegaCentral.name}, ${bodegaNorte.name}, ${bodegaSur.name}`);

  // ================= USUARIOS =================
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@stockhub.cl';
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin123456!';
  const hashedAdminPassword = await bcrypt.hash(rawAdminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedAdminPassword, rut: '11111111-1', assignedWarehouseId: bodegaCentral.id },
    create: {
      email: adminEmail,
      name: 'Luis Miguel Gallego Basteri',
      rut: '11111111-1',
      password: hashedAdminPassword,
      role: Role.ADMIN,
      isActive: true,
      assignedWarehouseId: bodegaCentral.id,
    },
  });

  const sellerEmail = 'vendedor@stockhub.cl';
  const hashedSellerPassword = await bcrypt.hash('Vendedor123!', 12);

  const sellerUser = await prisma.user.upsert({
    where: { email: sellerEmail },
    update: { password: hashedSellerPassword, rut: '22222222-2', assignedWarehouseId: bodegaCentral.id },
    create: {
      email: sellerEmail,
      name: 'Juan Pérez (Vendedor)',
      rut: '22222222-2',
      password: hashedSellerPassword,
      role: Role.VENDEDOR,
      isActive: true,
      assignedWarehouseId: bodegaCentral.id,
    },
  });

  console.log(`✅ Usuarios listos: Admin y Vendedor`);

  // ================= PRODUCTOS =================
  const productosData = [
    { sku: 'SKU-001', barcode: '7801234560001', name: 'Monitor Samsung 24"', brand: 'Samsung', status: ProductStatus.ACTIVO, criticalStock: 10, price: 120000, bodegaId: bodegaCentral.id, stock: 3 },
    { sku: 'SKU-001', barcode: '7801234560001', name: 'Monitor Samsung 24"', brand: 'Samsung', status: ProductStatus.ACTIVO, criticalStock: 10, price: 120000, bodegaId: bodegaSur.id, stock: 100 },
    { sku: 'SKU-002', barcode: '7801234560002', name: 'Teclado Logitech K400', brand: 'Logitech', status: ProductStatus.ACTIVO, criticalStock: 10, price: 25000, bodegaId: bodegaCentral.id, stock: 6 },
    { sku: 'SKU-003', barcode: '7801234560003', name: 'Mouse Inalámbrico HP', brand: 'HP', status: ProductStatus.ACTIVO, criticalStock: 15, price: 15000, bodegaId: bodegaNorte.id, stock: 18 },
    { sku: 'SKU-004', barcode: '7801234560004', name: 'Silla Ergonómica Mesh', brand: 'OfficePro', status: ProductStatus.EN_OFERTA, criticalStock: 5, price: 85000, bodegaId: bodegaCentral.id, stock: 4 },
    { sku: 'SKU-005', barcode: '7801234560005', name: 'Cinta de Embalaje 50mm', brand: 'Genérico', status: ProductStatus.ACTIVO, criticalStock: 20, price: 1500, bodegaId: bodegaSur.id, stock: 42 },
    { sku: 'SKU-006', barcode: '7801234560006', name: 'Notebook Lenovo V15', brand: 'Lenovo', status: ProductStatus.ACTIVO, criticalStock: 8, price: 350000, bodegaId: bodegaCentral.id, stock: 2 },
    { sku: 'SKU-007', barcode: '7801234560007', name: 'Papel Carta 75g Resma', brand: 'Navigator', status: ProductStatus.ACTIVO, criticalStock: 30, price: 4500, bodegaId: bodegaNorte.id, stock: 85 },
    { sku: 'SKU-008', barcode: '7801234560008', name: 'Proyector Optoma HD', brand: 'Optoma', status: ProductStatus.INACTIVO, criticalStock: 3, price: 280000, bodegaId: bodegaCentral.id, stock: 0 },
  ];

  for (const prod of productosData) {
    // Crear o actualizar el producto
    const dbProduct = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: { basePrice: prod.price, status: prod.status, criticalStock: prod.criticalStock },
      create: {
        sku: prod.sku,
        barcode: prod.barcode,
        name: prod.name,
        brand: prod.brand,
        supplier: 'Distribuidor Nacional',
        unitOfMeasure: 'UNIDAD',
        basePrice: prod.price,
        criticalStock: prod.criticalStock,
        status: prod.status,
      },
    });

    // Asignar el stock a la bodega correspondiente
    await prisma.stock.upsert({
      where: {
        productId_warehouseId: {
          productId: dbProduct.id,
          warehouseId: prod.bodegaId,
        },
      },
      update: { quantity: prod.stock },
      create: {
        productId: dbProduct.id,
        warehouseId: prod.bodegaId,
        quantity: prod.stock,
      },
    });
  }

  console.log(`✅ Catálogo e inventario sincronizados (${productosData.length} productos asignados)`);
  console.log('🚀 Seed ejecutado con éxito. Entorno listo para pruebas.');
}

main()
  .catch((e) => {
    console.error('❌ Error fatal al ejecutar el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });