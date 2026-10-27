import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la carga de seed...');

  // Limpiar datos previos si es necesario
//   await prisma.refreshToken.deleteMany();
//   await prisma.movement.deleteMany();
//   await prisma.saleDetail.deleteMany();
//   await prisma.sale.deleteMany();
//   await prisma.stock.deleteMany();
//   await prisma.user.deleteMany();
//   await prisma.product.deleteMany();
//   await prisma.warehouse.deleteMany();

  // Crear Bodega Central inicial
  const defaultWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Bodega Central',
      location: 'Casa Matriz - Sector A',
      isActive: true,
    },
  });

  console.log(`✅ Bodega creada: ${defaultWarehouse.name} (${defaultWarehouse.id})`);

  // Crear datos del Admin iniciales
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const rawPassword = process.env.INITIAL_ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // Crear Usuario Administrador inicial
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Luis Miguel Gallego Basteri',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
      assignedWarehouseId: defaultWarehouse.id,
    },
  });

  console.log(`✅ Usuario Admin creado: ${adminUser.name}, con el mail ${adminUser.email}`);
  console.log('Fin seed.');
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });