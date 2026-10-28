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

  // Crear o actualizar Bodega Central
  const defaultWarehouse = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      name: 'Bodega Central',
      location: 'Casa Matriz - Sector A',
      isActive: true,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Bodega Central',
      location: 'Casa Matriz - Sector A',
      isActive: true,
    },
  });

  console.log(`✅ Bodega lista: ${defaultWarehouse.name}`);

  // Crear o actualizar Usuario Administrador
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@stockhub.cl';
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin123456!';
  const hashedAdminPassword = await bcrypt.hash(rawAdminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      assignedWarehouseId: defaultWarehouse.id,
    },
    create: {
      email: adminEmail,
      name: 'Luis Miguel Gallego Basteri',
      password: hashedAdminPassword,
      role: Role.ADMIN,
      isActive: true,
      assignedWarehouseId: defaultWarehouse.id,
    },
  });

  console.log(`✅ Usuario Admin listo: ${adminUser.name} (${adminUser.email})`);

  // Crear o actualizar Usuario Vendedor
  const sellerEmail = 'vendedor@stockhub.cl';
  const hashedSellerPassword = await bcrypt.hash('Vendedor123!', 10);

  const sellerUser = await prisma.user.upsert({
    where: { email: sellerEmail },
    update: {
      password: hashedSellerPassword,
      assignedWarehouseId: defaultWarehouse.id,
    },
    create: {
      email: sellerEmail,
      name: 'Juan Pérez (Vendedor)',
      password: hashedSellerPassword,
      role: Role.VENDEDOR,
      isActive: true,
      assignedWarehouseId: defaultWarehouse.id,
    },
  });

  console.log(`✅ Usuario Vendedor listo: ${sellerUser.name} (${sellerUser.email})`);

  // Crear Producto de Prueba en Catálogo
  const sampleProduct = await prisma.product.upsert({
    where: { sku: 'BEB-COC-3L' },
    update: {
      basePrice: 2500.00,
      status: ProductStatus.ACTIVO,
    },
    create: {
      sku: 'BEB-COC-3L',
      barcode: '7801234567890',
      name: 'Bebida Fantasía 3 Litros',
      brand: 'Coca-Cola',
      supplier: 'Embonor S.A.',
      unitOfMeasure: 'UNIDAD',
      weight: 3.100,
      basePrice: 2500.00,
      criticalStock: 10.000,
      status: ProductStatus.ACTIVO,
    },
  });

  console.log(`✅ Producto de prueba listo: ${sampleProduct.name} [SKU: ${sampleProduct.sku}]`);

  // Asignar Stock Inicial al Producto en la Bodega Central
  const initialStock = await prisma.stock.upsert({
    where: {
      productId_warehouseId: {
        productId: sampleProduct.id,
        warehouseId: defaultWarehouse.id,
      },
    },
    update: {
      quantity: 100.000,
    },
    create: {
      productId: sampleProduct.id,
      warehouseId: defaultWarehouse.id,
      quantity: 100.000,
    },
  });

  console.log(`✅ Stock asignado: ${initialStock.quantity} unidades para ${sampleProduct.sku} en ${defaultWarehouse.name}`);
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