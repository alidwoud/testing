import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  Row,
  Col,
  Space,
  Button,
} from 'antd';
import { useJobs } from '../../context/JobContext.tsx';
import { JobPriority, WorkOrderType } from '../../types/jobTypes.ts';
import dayjs from 'dayjs';

export const CreateJobModal: React.FC = () => {
  const {
    isCreateJobModalOpen,
    setIsCreateJobModalOpen,
    clients,
    technicians,
    addJob,
    setSelectedJob,
  } = useJobs();

  const [form] = Form.useForm();

  const handleFinish = (values: any) => {
    const client = clients.find((c) => c.id === values.clientId) || clients[0];
    const scheduledDate = values.scheduledDate ? values.scheduledDate.format('YYYY-MM-DD') : '2026-10-20';
    const startTime = values.timeRange ? values.timeRange[0].format('HH:mm') : '08:00';
    const endTime = values.timeRange ? values.timeRange[1].format('HH:mm') : '12:00';

    const newJob = addJob({
      title: values.title,
      description: values.description,
      clientId: client.id,
      clientName: client.name,
      siteAddress: values.siteAddress || client.address,
      siteCity: values.siteCity || client.suburb.split(' ')[0] || 'Melbourne',
      sitePostcode: '3000',
      priority: values.priority as JobPriority,
      workOrderType: values.workOrderType as WorkOrderType,
      status: 'New',
      scheduledDate,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      assignedTechIds: values.assignedTechIds || [],
      estimatedHours: values.estimatedHours || 4,
      estimatedCost: (values.estimatedHours || 4) * 85,
      quoteAmount: values.quoteAmount || 950,
      checklist: [
        { id: `t-${Date.now()}-1`, label: 'Site hazard check & risk assessment sign-off', completed: false },
        { id: `t-${Date.now()}-2`, label: 'Complete scope of works as documented', completed: false },
        { id: `t-${Date.now()}-3`, label: 'Customer verification & testing sign-off', completed: false },
      ],
      materials: [],
    });

    form.resetFields();
    setIsCreateJobModalOpen(false);
    setSelectedJob(newJob);
  };

  return (
    <Modal
      open={isCreateJobModalOpen}
      onCancel={() => setIsCreateJobModalOpen(false)}
      title={<div className="font-bold text-base text-slate-900">Create New Field Work Order</div>}
      footer={null}
      width={680}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          priority: 'Medium',
          workOrderType: 'Preventative Maintenance',
          estimatedHours: 4,
          quoteAmount: 1100,
          scheduledDate: dayjs('2026-10-20'),
          timeRange: [dayjs('08:00', 'HH:mm'), dayjs('12:00', 'HH:mm')],
        }}
        className="pt-2"
      >
        <Form.Item
          label="Work Order Title"
          name="title"
          rules={[{ required: true, message: 'Please provide a descriptive work order title' }]}
        >
          <Input placeholder="e.g. Quarterly Chiller Compressor Overhaul & Oil Filter Replacement" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Client Account"
              name="clientId"
              rules={[{ required: true, message: 'Please select a client' }]}
            >
              <Select placeholder="Select Client Account" showSearch optionFilterProp="label">
                {clients.map((c) => (
                  <Select.Option key={c.id} value={c.id} label={c.name}>
                    {c.name} ({c.industry.split(' ')[0]})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Work Order Type"
              name="workOrderType"
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="Emergency Repair">Emergency Repair</Select.Option>
                <Select.Option value="Preventative Maintenance">Preventative Maintenance</Select.Option>
                <Select.Option value="Installation">Installation</Select.Option>
                <Select.Option value="Safety Inspection">Safety Inspection</Select.Option>
                <Select.Option value="Commissioning">Commissioning</Select.Option>
                <Select.Option value="Quoted Work">Quoted Work</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Priority Level" name="priority" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Emergency">🚨 Emergency (Immediate Dispatch)</Select.Option>
                <Select.Option value="High">⚠️ High Priority</Select.Option>
                <Select.Option value="Medium">⚡ Medium Priority</Select.Option>
                <Select.Option value="Low">💤 Low / Routine</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label="Assigned Field Technicians" name="assignedTechIds">
              <Select mode="multiple" placeholder="Select Technicians" maxTagCount="responsive">
                {technicians.map((t) => (
                  <Select.Option key={t.id} value={t.id}>
                    {t.name} ({t.trade.split(' ')[0]})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Site Address & Suburb" name="siteAddress">
              <Input placeholder="e.g. 10 Foundation Road, Laverton North" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Site Suburb / City" name="siteCity">
              <Input placeholder="e.g. Laverton North" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Scheduled Date" name="scheduledDate">
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Time Window" name="timeRange">
              <TimePicker.RangePicker className="w-full" format="HH:mm" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Estimated Labour Hours" name="estimatedHours">
              <InputNumber min={0.5} step={0.5} className="w-full" addonAfter="hours" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Quote / Contract Value ($)" name="quoteAmount">
              <InputNumber min={0} prefix="$" className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Technical Description & Customer Notes" name="description">
          <Input.TextArea
            rows={3}
            placeholder="Detailed instructions for field crew, specific equipment models, safety isolations, or client access keys..."
          />
        </Form.Item>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button onClick={() => setIsCreateJobModalOpen(false)}>Cancel</Button>
          <Button type="primary" htmlType="submit" className="bg-blue-600 font-semibold px-5">
            Dispatch Work Order
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
