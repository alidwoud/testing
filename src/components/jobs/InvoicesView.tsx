import React from 'react';
import { Card, Table, Tag, Button, Statistic, Row, Col, Space, message } from 'antd';
import {
  DollarCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { Invoice } from '../../types/jobTypes.ts';

const STATUS_TAGS: Record<Invoice['status'], { color: string }> = {
  Draft: { color: 'default' },
  Sent: { color: 'blue' },
  Paid: { color: 'success' },
  Overdue: { color: 'red' },
};

export const InvoicesView: React.FC = () => {
  const { invoices, markInvoicePaid, jobs, setSelectedJob } = useJobs();

  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((acc, inv) => acc + inv.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status === 'Sent' || i.status === 'Draft').reduce((acc, inv) => acc + inv.total, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'Overdue').reduce((acc, inv) => acc + inv.total, 0);

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (num: string) => (
        <span className="font-mono font-bold text-xs text-slate-900">{num}</span>
      ),
    },
    {
      title: 'Linked Job',
      dataIndex: 'jobCode',
      key: 'jobCode',
      render: (code: string, record: Invoice) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            const job = jobs.find((j) => j.id === record.jobId || j.jobCode === code);
            if (job) setSelectedJob(job);
          }}
          className="p-0 font-mono text-xs font-semibold text-blue-600"
        >
          {code}
        </Button>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (client: string) => <span className="font-semibold text-xs text-slate-800">{client}</span>,
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      key: 'subtotal',
      align: 'right' as const,
      render: (val: number) => <span className="font-mono text-xs text-slate-600">${val.toFixed(2)}</span>,
    },
    {
      title: 'GST (10%)',
      dataIndex: 'tax',
      key: 'tax',
      align: 'right' as const,
      render: (val: number) => <span className="font-mono text-xs text-slate-600">${val.toFixed(2)}</span>,
    },
    {
      title: 'Total (AUD)',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (val: number) => (
        <span className="font-mono font-bold text-xs text-slate-900">${val.toLocaleString()}</span>
      ),
      sorter: (a: Invoice, b: Invoice) => a.total - b.total,
    },
    {
      title: 'Issue Date',
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (d: string) => <span className="font-mono text-xs text-slate-600">{d}</span>,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d: string) => <span className="font-mono text-xs text-slate-600">{d}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Invoice['status']) => (
        <Tag color={STATUS_TAGS[status].color} className="text-xs font-medium">
          {status}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: Invoice) => {
        if (record.status === 'Paid') {
          return (
            <span className="text-[11px] text-emerald-600 font-medium">
              ✓ Paid {record.paidDate}
            </span>
          );
        }
        return (
          <Button
            size="small"
            type="primary"
            ghost
            onClick={() => markInvoicePaid(record.id)}
            className="text-xs"
          >
            Mark Paid
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Financial Overview Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="border-slate-200 rounded-xl shadow-2xs">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Total Invoiced</span>}
              value={totalInvoiced}
              formatter={(v) => `$${Number(v).toLocaleString()}`}
              prefix={<DollarCircleOutlined className="text-blue-600" />}
              valueStyle={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="border-slate-200 rounded-xl shadow-2xs">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Received Payments</span>}
              value={totalPaid}
              formatter={(v) => `$${Number(v).toLocaleString()}`}
              prefix={<CheckCircleOutlined className="text-emerald-600" />}
              valueStyle={{ fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="border-slate-200 rounded-xl shadow-2xs">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Outstanding Invoices</span>}
              value={totalOutstanding}
              formatter={(v) => `$${Number(v).toLocaleString()}`}
              prefix={<ClockCircleOutlined className="text-blue-500" />}
              valueStyle={{ fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="border-slate-200 rounded-xl shadow-2xs">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Overdue Collections</span>}
              value={totalOverdue}
              formatter={(v) => `$${Number(v).toLocaleString()}`}
              prefix={<AlertOutlined className="text-red-600" />}
              valueStyle={{ fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 m-0">Invoices & Tax Ledger</h3>
          <span className="text-xs text-slate-600">{invoices.length} billing records</span>
        </div>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </div>
    </div>
  );
};
